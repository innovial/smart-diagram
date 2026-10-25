import type { DiagramTemplate } from '$lib/types';

export const TEMPLATES: DiagramTemplate[] = [
  {
    id: 'mermaid-flowchart',
    name: 'Payment Processing Flow',
    type: 'mermaid',
    category: 'Mermaid',
    description: 'Decision flow with branching, statuses, and service calls',
    code: `graph TD
    Start([User Initiates Checkout]) --> CartCheck{Cart Valid?}
    CartCheck -- No --> FixCart[Prompt User to Review Items]
    FixCart --> Start
    CartCheck -- Yes --> AuthCard[Authorize Card via Gateway]
    
    AuthCard --> GatewayResp{Gateway Result}
    GatewayResp -- Approved --> ReserveInventory[Reserve Warehouse Stock]
    GatewayResp -- Declined --> ShowError[Display Decline Reason]
    ShowError --> RetryPrompt{Retry Card?}
    RetryPrompt -- Yes --> AuthCard
    RetryPrompt -- No --> Abandon([Checkout Cancelled])

    ReserveInventory --> CreateInvoice[Generate PDF Invoice & Receipt]
    CreateInvoice --> NotifyUser[Send Email & SMS Notification]
    NotifyUser --> Complete([Order Fulfilled Successfully])

    style Start fill:#2563eb,stroke:#1d4ed8,color:#fff
    style Complete fill:#16a34a,stroke:#15803d,color:#fff
    style Abandon fill:#dc2626,stroke:#b91c1c,color:#fff`
  },
  {
    id: 'mermaid-sequence',
    name: 'OAuth2 Authentication Flow',
    type: 'mermaid',
    category: 'Mermaid',
    description: 'Authentication sequence with PKCE authorization code exchange',
    code: `sequenceDiagram
    autonumber
    actor User as User Browser
    participant Client as Frontend SPA
    participant Auth0 as Auth Server (IDP)
    participant API as Resource Backend

    User->>Client: Click "Sign in with SSO"
    Client->>Client: Generate Code Verifier & Challenge (PKCE)
    Client->>Auth0: GET /authorize?code_challenge=xyz
    Auth0-->>User: Display Login & 2FA Consent
    User->>Auth0: Submit Credentials + OTP
    Auth0-->>Client: Redirect with auth_code
    Client->>Auth0: POST /oauth/token (code + code_verifier)
    Auth0-->>Client: Return JWT Access & ID Token
    Client->>API: GET /api/v1/profile (Bearer token)
    API->>API: Verify Signature & Claims
    API-->>Client: 200 OK (User Profile Data)
    Client-->>User: Render Authenticated Dashboard`
  },
  {
    id: 'mermaid-state',
    name: 'Order Lifecycle State Machine',
    type: 'mermaid',
    category: 'Mermaid',
    description: 'State transitions for an order from creation to delivery or refund',
    code: `stateDiagram-v2
    [*] --> Draft
    Draft --> PendingPayment: Checkout Submitted
    Draft --> Cancelled: Abandoned by User

    PendingPayment --> Paid: Payment Captured
    PendingPayment --> PaymentFailed: Card Declined
    PaymentFailed --> PendingPayment: Retry New Payment
    PaymentFailed --> Cancelled: Timeout (24h)

    Paid --> Processing: Sent to Warehouse
    Processing --> Shipped: Carrier Tracking Assigned
    Shipped --> Delivered: Confirmed by Courier
    
    Delivered --> RefundRequested: Return Filed (< 14 days)
    RefundRequested --> Refunded: Item Inspected & Restocked
    RefundRequested --> Delivered: Return Rejected

    Cancelled --> [*]
    Refunded --> [*]
    Delivered --> [*]`
  },
  {
    id: 'mermaid-gitgraph',
    name: 'Git Branching Strategy',
    type: 'mermaid',
    category: 'Mermaid',
    description: 'Git branching model with feature branches, release, and hotfix',
    code: `gitGraph
    commit id: "v1.0.0"
    branch develop
    checkout develop
    commit id: "setup auth"
    commit id: "add user model"
    branch feature/diagram-editor
    checkout feature/diagram-editor
    commit id: "integrate codemirror"
    commit id: "add live preview"
    checkout develop
    merge feature/diagram-editor
    branch release/v1.1.0
    checkout release/v1.1.0
    commit id: "bump version"
    checkout main
    merge release/v1.1.0 tag: "v1.1.0"
    checkout develop
    merge release/v1.1.0`
  },
  {
    id: 'mermaid-mindmap',
    name: 'Architecture Mindmap',
    type: 'mermaid',
    category: 'Mermaid',
    description: 'Decomposition of core system architecture modules',
    code: `mindmap
  root((Smart Diagram))
    Editor Engine
      CodeMirror 6
      Syntax Highlighting
      Auto Completion
      Error Underlines
    Diagram Compilers
      Mermaid Core
        Flowcharts
        Sequence
        State
        GitGraph
      DBML Parser
        AST Extraction
        ER Transpiler
        Table Schema Inspector
    Interactive Canvas
      Hardware Zoom
      Smooth Panning
      Grid Modes
      Responsive Center
    Export & Storage
      SVG Clean Vector
      PNG High DPI
      Native OS Filesystem
      Instant Clipboard`
  },
  {
    id: 'dbml-ecommerce',
    name: 'E-Commerce Database Schema',
    type: 'dbml',
    category: 'DBML',
    description: 'Complete e-commerce relational database with users, products, orders, and reviews',
    code: `// E-Commerce Database Model
Table users {
  id integer [pk, increment]
  username varchar(50) [unique, not null]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  role varchar(20) [default: "customer"]
  created_at timestamp [default: \`now()\`]
}

Table categories {
  id integer [pk, increment]
  name varchar(100) [not null]
  slug varchar(120) [unique, not null]
  parent_id integer [null]
}

Table products {
  id integer [pk, increment]
  category_id integer [not null]
  sku varchar(64) [unique, not null]
  title varchar(255) [not null]
  price decimal(10,2) [not null]
  stock_quantity integer [default: 0]
  is_active boolean [default: true]
  created_at timestamp
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null]
  status varchar(30) [default: "pending"]
  total_amount decimal(12,2) [not null]
  shipping_address text [not null]
  created_at timestamp
}

Table order_items {
  id integer [pk, increment]
  order_id integer [not null]
  product_id integer [not null]
  quantity integer [not null, default: 1]
  unit_price decimal(10,2) [not null]
}

Table reviews {
  id integer [pk, increment]
  user_id integer [not null]
  product_id integer [not null]
  rating integer [not null, note: "Rating from 1 to 5"]
  comment text
  created_at timestamp
}

Ref: products.category_id > categories.id
Ref: orders.user_id > users.id
Ref: order_items.order_id > orders.id
Ref: order_items.product_id > products.id
Ref: reviews.user_id > users.id
Ref: reviews.product_id > products.id
Ref: categories.parent_id > categories.id`
  },
  {
    id: 'dbml-saas',
    name: 'SaaS Multi-Tenant Schema',
    type: 'dbml',
    category: 'DBML',
    description: 'Multi-tenant architecture with organizations, subscriptions, roles, and invoices',
    code: `// Multi-Tenant SaaS Schema
Table organizations {
  id uuid [pk]
  name varchar(150) [not null]
  slug varchar(100) [unique, not null]
  plan_tier varchar(50) [default: "starter"]
  created_at timestamp
}

Table users {
  id uuid [pk]
  email varchar(255) [unique, not null]
  full_name varchar(150)
  avatar_url text
  created_at timestamp
}

Table memberships {
  id uuid [pk]
  org_id uuid [not null]
  user_id uuid [not null]
  role varchar(50) [default: "member", note: "owner, admin, member, viewer"]
  invited_at timestamp
}

Table subscriptions {
  id uuid [pk]
  org_id uuid [unique, not null]
  stripe_customer_id varchar(100)
  status varchar(50) [default: "active"]
  current_period_end timestamp
}

Table invoices {
  id uuid [pk]
  org_id uuid [not null]
  subscription_id uuid [not null]
  amount_cents integer [not null]
  currency varchar(3) [default: "USD"]
  paid_at timestamp
}

Table audit_logs {
  id uuid [pk]
  org_id uuid [not null]
  user_id uuid [not null]
  action varchar(100) [not null]
  ip_address varchar(45)
  created_at timestamp
}

Ref: memberships.org_id > organizations.id
Ref: memberships.user_id > users.id
Ref: subscriptions.org_id > organizations.id
Ref: invoices.org_id > organizations.id
Ref: invoices.subscription_id > subscriptions.id
Ref: audit_logs.org_id > organizations.id
Ref: audit_logs.user_id > users.id`
  }
];

export function getTemplateById(id: string): DiagramTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
