import { NextRequest, NextResponse } from 'next/server'
import { directDb } from '@/lib/direct-db'
import { uploadCompletionProof } from '@/utils/file-upload'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

async function updateOrderWithCompletionProof(orderId: string, proofUrl: string) {
  console.log('Updating order with completion proof:', orderId, proofUrl)
  
  // Start transaction
  await directDb.query('BEGIN')
  
  try {
    // Get current order details
    const [order] = await directDb.query<{
      id: string
      order_number: string
      type: string
      status: string
      exchange_name: string
    }>(`
      SELECT 
        o."id",
        o."order_number",
        o."type",
        o."status",
        e."name" as exchange_name
      FROM "orders" o
      JOIN "exchanges" e ON o."exchange_id" = e."id"
      WHERE o."id" = $1
      FOR UPDATE
    `, [orderId])

    if (!order) {
      throw new Error('Order not found')
    }

    // Validate order type and status
    if (order.type !== 'OUTGOING') {
      throw new Error('Completion proofs can only be uploaded for outgoing transfers')
    }

    if (order.status !== 'PROCESSING') {
      throw new Error(`Cannot upload completion proof for order with status: ${order.status}`)
    }

    // Update order with completion proof URL and mark as completed
    await directDb.query(`
      UPDATE "orders" 
      SET 
        "completion_proof_url" = $1,
        "status" = 'COMPLETED',
        "completed_at" = NOW(),
        "updated_at" = NOW()
      WHERE "id" = $2
    `, [proofUrl, orderId])

    await directDb.query('COMMIT')

    console.log(`Completion proof uploaded for order ${order.order_number} and marked as COMPLETED`)

    return {
      success: true,
      message: `Completion proof uploaded and order ${order.order_number} marked as completed`,
      orderNumber: order.order_number,
      exchangeName: order.exchange_name,
      proofUrl
    }

  } catch (error) {
    await directDb.query('ROLLBACK')
    throw error
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orderId } = await context.params

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG, JPG, and JPEG files are allowed' },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Upload file to Supabase Storage
    const uploadResult = await uploadCompletionProof(file, orderId)

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload file' },
        { status: 500 }
      )
    }

    if (!uploadResult.url) {
      return NextResponse.json(
        { error: 'Upload succeeded but no URL returned' },
        { status: 500 }
      )
    }

    // Update order with completion proof
    const result = await updateOrderWithCompletionProof(orderId, uploadResult.url)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Completion proof upload API error:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Order not found') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Completion proofs can only be uploaded') ||
          error.message.includes('Cannot upload completion proof')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to upload completion proof',
        details: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
} 