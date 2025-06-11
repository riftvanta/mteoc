# Financial Transfer Management System - App Features

> **Mobile-first web application for managing financial transfers between exchange offices and admin**

## 📋 System Overview

**Purpose**: Internal financial transfer management system for exchange offices with real-time order processing, balance management, and communication features.

**Core Technologies**: Next.js 15 + Supabase + Real-time subscriptions + Mobile-first UI

---

## 👥 User Roles & Access Control

### **Admin Role**
- **Single admin level** - No super admin vs regular admin distinction
- **Full system control** - Manages all users, orders, and system settings
- **User Management** - Creates and manages all exchange office accounts
- **Global Configuration** - Sets commission rates, bank lists, and system settings

### **Exchange Office Role**
- **Isolated Access** - Can only view and manage their own orders
- **No Cross-Exchange Visibility** - Cannot see other exchanges' data
- **Self-Service Operations** - Submit orders, upload documents, communicate with admin

---

## 🏦 User Management

### **Admin User Creation**
```
Admin creates exchange office accounts with:
- Exchange office name
- Contact information
- Initial balance (can be positive, negative, or zero)
- Commission rates (incoming/outgoing)
- Allowed banks/digital wallets (incoming/outgoing)
- Default transfer types
```

### **Exchange Office Profiles**
- Basic information (name, contact)
- Current balance (real-time updates)
- Commission settings (view-only)
- Allowed payment methods (view-only)
- Transaction history

---

## 💰 Financial Configuration

### **Commission Structure**
- **Per Exchange Configuration** - Each exchange has custom rates
- **Per Transaction Type** - Different rates for incoming vs outgoing
- **Commission Types**:
  - **Fixed Amount** - Specific JOD amount per transaction
  - **Percentage** - 1-3% of transaction amount (typical range)
- **Real-time Calculation** - Commission calculated and displayed during order creation

### **Balance Management**
- **Initial Balance** - Set by admin during account creation
- **Real-time Updates** - Balance changes instantly with order status updates
- **Negative Balances** - Allowed (no restrictions)
- **Balance Calculations**:
  - **Outgoing**: Balance - (Amount + Commission)
  - **Incoming**: Balance + (Amount - Commission)

---

## 🏪 Banking & Payment Methods

### **Jordanian Banks & Digital Wallets**
- **Admin Configurable** - Not hardcoded, fully manageable by admin
- **Per Exchange Settings** - Different allowed methods per exchange
- **Per Transaction Type** - Separate lists for incoming vs outgoing
- **Digital Wallets Supported**:
  - Zain Cash
  - Orange Money
  - UWallet
  - DInarak

### **CliQ Payment Integration**
- **Bank Alias Name** - Required for outgoing transfers
- **Bank Alias Mobile Number** - Jordanian mobile number (required)
- **Mobile Number Validation**:
  - Format 1: `0096277/78/79/XXXXXXX`
  - Format 2: `07/7/8/9XXXXXXX`

---

## 📤 Outgoing Transfer Orders

### **Required Information**
- **CliQ Payment Method**: 
  - Bank alias name (mandatory)
  - Bank alias mobile number (mandatory, Jordanian format)
- **Amount in JOD** (mandatory)

### **Optional Information**
- **Recipient Name**
- **Recipient Bank Name** (from allowed Jordanian banks + digital wallets)

### **Process Flow**
1. Exchange submits outgoing transfer order
2. System debits balance (amount + commission)
3. Admin reviews and approves/rejects
4. If approved → Processing → Admin uploads completion screenshot
5. Order marked as Completed
6. Exchange can download and share screenshot to WhatsApp

---

## 📥 Incoming Transfer Orders

### **Required Information**
- **Amount** (mandatory)
- **Payment Proof Screenshot** (mandatory upload)
- **Bank Used** (from admin-approved list for that exchange)

### **Optional Information**
- **Sender Name**

### **Process Flow**
1. Exchange submits incoming transfer order with screenshot
2. Admin reviews submitted proof
3. Admin confirms actual amount received (may differ from submitted amount)
4. If approved → amount credited to exchange balance (minus commission)
5. Order marked as Completed

---

## 📋 Order Management System

### **Order ID Generation**
- **Pattern Format**: `TYYMMXXXX`
  - **T** - Transfer identifier (literal "T")
  - **YY** - Year (2 digits, e.g., "25" for 2025)
  - **MM** - Month (2 digits, e.g., "06" for June)
  - **XXXX** - Sequential order number (4 digits, zero-padded)
- **Example**: `T25060001` - First order in June 2025
- **Auto-Generation**: System automatically generates unique IDs
- **Monthly Reset**: Sequential numbering resets each month
- **Uniqueness**: Guaranteed unique within the TYYMMXXXX pattern
- **Timezone**: All timestamps use **Jordanian local time (Amman timezone)**

### **Order Status Workflow**
```
Submitted → Pending Review → Approved/Rejected → Processing → Completed
     ↓              ↓                                ↓
 Cancelled      Cancelled                      Cancelled (admin approval)
```

### **Order Status Details**
- **Submitted** - Order created by exchange, awaiting admin review (editable/cancellable by exchange)
- **Pending Review** - Admin reviewing order details and documentation (editable/cancellable by exchange)
- **Approved** - Admin approved, order moves to processing (no longer editable)
- **Rejected** - Admin rejected with reason (final status)
- **Processing** - Order is being processed by admin (cancellation request only)
- **Completed** - Order finished, screenshots uploaded (outgoing), amounts confirmed (incoming) (final status)
- **Cancelled** - Order cancelled by exchange or admin, balance restored (final status)

### **Admin Actions**
- **Review Orders** - View all submitted orders from all exchanges
- **Approve/Reject** - With optional reason for rejection
- **Upload Screenshots** - For completed outgoing transfers
- **Confirm Amounts** - For incoming transfers (actual vs submitted amount)
- **Process Management** - Move orders through status workflow
- **Handle Cancellation Requests** - Approve/reject exchange cancellation requests for processing orders

### **Exchange Actions**
- **Cancel Pending Orders** - Direct cancellation for orders in "Submitted" or "Pending Review" status
- **Request Cancellation** - Submit cancellation request for orders in "Processing" status (requires admin approval)
- **Edit Pending Orders** - Modify order details for both incoming and outgoing transfers in "Submitted" or "Pending Review" status
- **Order Modifications** - Update amounts, recipient details, bank information, and upload new screenshots

---

## ✏️ Order Modifications & Cancellations

### **Order Editing (Exchange)**
- **Editable Status** - Orders can only be edited when in "Submitted" or "Pending Review" status
- **Incoming Transfer Edits**:
  - Modify amount
  - Change sender name
  - Update bank used (from approved list)
  - Upload new payment proof screenshot
- **Outgoing Transfer Edits**:
  - Modify amount in JOD
  - Update CliQ payment details (bank alias name/mobile number)
  - Change recipient name and bank name
- **Edit Restrictions** - No editing allowed once order reaches "Approved", "Processing", or "Completed" status

### **Order Cancellation (Exchange)**
- **Direct Cancellation** - Immediate cancellation for "Submitted" and "Pending Review" orders
  - No admin approval required
  - Instant balance restoration (for outgoing transfers)
  - Order status changes to "Cancelled"
- **Cancellation Request** - For orders in "Processing" status
  - Submit cancellation request to admin
  - Admin can approve or reject the request
  - If approved, balance is restored and order marked as "Cancelled"
  - If rejected, order continues processing

### **Balance Impact**
- **Successful Cancellation** - Balance is immediately restored to pre-order state
- **Edit with Amount Change** - Balance automatically recalculated based on new amount and commission
- **Real-time Updates** - All balance changes reflected instantly across the system

---

## 💬 Real-time Communication

### **Order-Specific Chat**
- **Dedicated Chat** - Each order has its own chat thread
- **Admin-Exchange Communication** - Direct messaging between admin and specific exchange
- **Chat History** - Preserved until manually deleted by admin
- **Real-time Messages** - Instant delivery using Supabase subscriptions

### **Chat Features**
- Text messages
- Read receipts
- Timestamp display (Jordanian local time)
- Order context integration
- Mobile-optimized interface

---

## 📱 File Management & Screenshots

### **Screenshot Requirements**
- **Outgoing Transfers** - Admin uploads completion proof
- **Incoming Transfers** - Exchange uploads payment proof

### **File Storage (Supabase Storage)**
- **Supported Formats** - PNG, JPG, JPEG
- **File Size Limit** - 5MB maximum (best practice)
- **Security** - Secure upload with virus scanning
- **Access Control** - Only order participants can view

### **WhatsApp Integration**
- **Download Feature** - Exchanges can download completed outgoing transfer screenshots
- **Share to WhatsApp** - Direct sharing functionality for mobile users
- **Mobile Optimization** - Native mobile sharing capabilities

---

## 🔔 Real-time Notifications

### **Order Status Notifications**
- **Instant Updates** - Real-time notifications for all status changes
- **Exchange Notifications**:
  - Order approved/rejected
  - Order moved to processing
  - Order completed
  - Cancellation request approved/rejected
- **Admin Notifications**:
  - New orders submitted
  - Orders edited by exchange
  - Cancellation requests from exchanges
  - Chat messages from exchanges

### **Balance Update Notifications**
- **Real-time Balance** - Instant balance updates after order status changes
- **Visual Indicators** - Clear display of balance changes

---

## 📊 Real-time Features

### **Live Data Updates**
- **Order Status** - Real-time status changes across all users
- **Order Modifications** - Instant updates when exchanges edit or cancel orders
- **Balance Updates** - Instant balance calculations and display (including cancellation restorations)
- **Chat Messages** - Live messaging without page refresh
- **New Order Alerts** - Immediate notifications for admins
- **Cancellation Requests** - Real-time alerts for admin when exchanges request cancellations

### **Supabase Real-time Subscriptions**
```javascript
// Order status updates
supabase
  .from('orders')
  .on('UPDATE', payload => {
    // Real-time order status updates
  })
  .subscribe()

// Balance updates
supabase
  .from('exchanges')
  .on('UPDATE', payload => {
    // Real-time balance updates
  })
  .subscribe()

// Chat messages
supabase
  .from('order_messages')
  .on('INSERT', payload => {
    // Real-time chat messages
  })
  .subscribe()
```

---

## 📱 Mobile-First Design

### **Responsive Interface**
- **Mobile-Optimized** - Both admin and exchange interfaces designed for mobile
- **Touch-Friendly** - Large buttons, easy navigation
- **Fast Loading** - Optimized for mobile performance
- **Offline Capabilities** - Basic functionality when connection is poor

### **Mobile-Specific Features**
- **Camera Integration** - Easy screenshot capture and upload
- **WhatsApp Sharing** - Native mobile sharing
- **Touch Gestures** - Swipe navigation, pull-to-refresh
- **Mobile Notifications** - Push notifications for status updates

---

## 🕐 Timezone & Time Management

### **Jordanian Local Time (Amman)**
- **Primary Timezone**: Eastern European Summer Time (EEST) - UTC+3
- **Consistent Usage**: All system timestamps use Jordanian local time
- **No DST Complexity**: Jordan does not observe Daylight Saving Time
- **Application Areas**:
  - Order ID generation (TYYMMXXXX pattern)
  - Chat message timestamps
  - Order creation and update times
  - Real-time notifications
  - Transaction history
  - Admin activity logs

### **Time Display Standards**
- **Format**: 24-hour format for admin, 12-hour format for mobile users
- **Date Format**: DD/MM/YYYY (European standard commonly used in Jordan)
- **Real-time Updates**: All timestamps sync to Jordanian local time
- **Time Zone Reference**: Asia/Amman timezone identifier

---

## 🔐 Security & Validation

### **Mobile Number Validation**
```javascript
// Jordanian mobile number formats
const jordanianMobileRegex = [
  /^00962(77|78|79)\d{7}$/,  // International format
  /^0(77|78|79)\d{7}$/       // Local format
]
```

### **Data Security**
- **File Upload Security** - Virus scanning, format validation
- **Access Control** - Strict isolation between exchanges
- **Data Encryption** - Secure transmission and storage
- **Authentication** - Session-based auth with JWT tokens

---

## 🎯 Key Success Metrics

### **Performance Goals**
- **< 2 seconds** - Page load times on mobile
- **< 100ms** - Real-time update latency
- **99.9%** - Uptime for critical operations
- **Mobile-First** - Optimized for mobile usage patterns

### **User Experience Goals**
- **Intuitive Interface** - Minimal learning curve
- **Real-time Feedback** - Instant status updates
- **Efficient Communication** - Quick admin-exchange interaction
- **Reliable File Handling** - Seamless screenshot management

---

**Summary**: Mobile-first financial transfer management system with real-time updates, order-specific communication, flexible commission structure, and secure file handling optimized for Jordanian market requirements. 