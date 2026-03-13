import express from 'express';
import { prisma as db } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Type definitions for request bodies
interface CreateCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
  userId: string;
}

interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  color?: string;
  parentId?: string;
}

// Helper function to build category hierarchy
async function buildCategoryHierarchy(userId: string, parentId: string | null = null): Promise<any[]> {
  const categories = await db.category.findMany({
    where: {
      OR: [
        { userId },
        { isSystem: true, userId: null }
      ],
      parentId
    },
    orderBy: { name: 'asc' }
  });

  const result = [];
  for (const category of categories) {
    const children = await buildCategoryHierarchy(userId, category.id);
    result.push({
      ...category,
      children
    });
  }

  return result;
}

// GET /api/categories - List all categories with hierarchy
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get categories with hierarchy
    const categoriesHierarchy = await buildCategoryHierarchy(userId);

    // Also get flat list for easier consumption
    const flatCategories = await db.category.findMany({
      where: {
        OR: [
          { userId },
          { isSystem: true, userId: null }
        ]
      },
      include: {
        parent: true,
        _count: {
          select: {
            transactions: true,
            budgets: true,
            children: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        hierarchy: categoriesHierarchy,
        flat: flatCategories
      },
      meta: {
        total: flatCategories.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// POST /api/categories - Create category
router.post('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, icon, color, parentId } = req.body as CreateCategoryRequest;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Category name is required'
        }
      });
    }

    // Check if parent category exists and belongs to user
    if (parentId) {
      const parentCategory = await db.category.findFirst({
        where: {
          id: parentId,
          OR: [
            { userId },
            { isSystem: true, userId: null }
          ]
        }
      });

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Parent category not found'
          }
        });
      }
    }

    // Check for duplicate category names within the same parent
    const existingCategory = await db.category.findFirst({
      where: {
        name: name.trim(),
        userId,
        parentId: parentId || null
      }
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CATEGORY',
          message: 'Category with this name already exists in the same parent'
        }
      });
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        icon,
        color,
        parentId,
        userId,
        isSystem: false
      },
      include: {
        parent: true,
        _count: {
          select: {
            transactions: true,
            budgets: true,
            children: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: category,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create category',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, icon, color, parentId } = req.body as UpdateCategoryRequest;

    // Check if category exists and belongs to user
    const existingCategory = await db.category.findFirst({
      where: {
        id,
        userId, // Only user-created categories can be updated
        isSystem: false
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found or cannot be modified'
        }
      });
    }

    // Validate parent category if provided
    if (parentId && parentId !== existingCategory.parentId) {
      // Check if new parent exists
      const parentCategory = await db.category.findFirst({
        where: {
          id: parentId,
          OR: [
            { userId },
            { isSystem: true, userId: null }
          ]
        }
      });

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Parent category not found'
          }
        });
      }

      // Prevent circular references
      if (parentId === id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category cannot be its own parent'
          }
        });
      }

      // Check if the new parent is not a descendant of current category
      const checkDescendant = async (categoryId: string, potentialParent: string): Promise<boolean> => {
        const children = await db.category.findMany({
          where: { parentId: categoryId }
        });
        
        for (const child of children) {
          if (child.id === potentialParent) return true;
          if (await checkDescendant(child.id, potentialParent)) return true;
        }
        return false;
      };

      if (await checkDescendant(id, parentId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cannot move category to its descendant'
          }
        });
      }
    }

    // Check for duplicate names if name is being changed
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await db.category.findFirst({
        where: {
          name: name.trim(),
          userId,
          parentId: parentId !== undefined ? parentId : existingCategory.parentId,
          id: { not: id }
        }
      });

      if (duplicateCategory) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_CATEGORY',
            message: 'Category with this name already exists in the same parent'
          }
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (parentId !== undefined) updateData.parentId = parentId;

    const updatedCategory = await db.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        _count: {
          select: {
            transactions: true,
            budgets: true,
            children: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedCategory,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update category',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if category exists and belongs to user
    const existingCategory = await db.category.findFirst({
      where: {
        id,
        userId,
        isSystem: false // System categories cannot be deleted
      },
      include: {
        _count: {
          select: {
            transactions: true,
            budgets: true,
            children: true
          }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found or cannot be deleted'
        }
      });
    }

    // Check if category has active transactions or budgets
    if (existingCategory._count.transactions > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'Cannot delete category with existing transactions. Please reassign transactions first.',
          details: {
            transactionCount: existingCategory._count.transactions
          }
        }
      });
    }

    if (existingCategory._count.budgets > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CATEGORY_IN_USE',
          message: 'Cannot delete category with existing budgets. Please delete budgets first.',
          details: {
            budgetCount: existingCategory._count.budgets
          }
        }
      });
    }

    // Handle child categories - move them to parent or root
    if (existingCategory._count.children > 0) {
      await db.category.updateMany({
        where: { parentId: id },
        data: { parentId: existingCategory.parentId }
      });
    }

    await db.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        childrenMoved: existingCategory._count.children
      }
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete category',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;