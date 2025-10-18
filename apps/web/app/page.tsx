'use client'
import { Button } from '@repo/ui/button'
import React from 'react'

const page = () => {
  return (
    <div>
        <h1>Welcome to the Web App</h1>
        <Button className='bg-blue-500 text-white ' onclick={() => alert('Button Clicked!')}>Click Me</Button>
    </div>
  )
}

export default page