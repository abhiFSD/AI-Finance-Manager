"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DataItem {
  name: string
  [key: string]: string | number
}

interface CustomLineChartProps {
  data: DataItem[]
  lines: Array<{
    dataKey: string
    color?: string
    name?: string
  }>
  title?: string
  xAxisKey?: string
}

export function CustomLineChart({ 
  data, 
  lines, 
  title, 
  xAxisKey = "name" 
}: CustomLineChartProps) {
  return (
    <div className="w-full h-80">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color || `hsl(var(--chart-${(index % 5) + 1}))`}
              strokeWidth={2}
              name={line.name || line.dataKey}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}