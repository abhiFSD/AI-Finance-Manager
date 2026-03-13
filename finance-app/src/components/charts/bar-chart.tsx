"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DataItem {
  name: string
  [key: string]: string | number
}

interface CustomBarChartProps {
  data: DataItem[]
  bars: Array<{
    dataKey: string
    color?: string
    name?: string
  }>
  title?: string
  xAxisKey?: string
}

export function CustomBarChart({ 
  data, 
  bars, 
  title, 
  xAxisKey = "name" 
}: CustomBarChartProps) {
  return (
    <div className="w-full h-80">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.color || `hsl(var(--chart-${(index % 5) + 1}))`}
              name={bar.name || bar.dataKey}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}