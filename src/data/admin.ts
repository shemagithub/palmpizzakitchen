export type AdminOrder = {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: "Pending" | "Preparing" | "Out for delivery" | "Delivered" | "Cancelled";
  time: string;
  phone: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  joined: string;
};

export const ADMIN_STATS = [
  { label: "Today's orders", value: "48", change: "+12%", tone: "text-pam-basil" },
  { label: "Revenue", value: "RWF 1,800,000", change: "+8%", tone: "text-pam-basil" },
  { label: "Active deliveries", value: "11", change: "Live", tone: "text-pam-red" },
  { label: "New customers", value: "7", change: "+3", tone: "text-pam-gold" },
] as const;

export const ADMIN_ORDERS: AdminOrder[] = [
  {
    id: "ORD-1048",
    customer: "Maya R.",
    items: "Pepperoni Delight ×1, Garlic Bread ×1",
    total: 25500,
    status: "Preparing",
    time: "2 min ago",
    phone: "+1 555 0148",
  },
  {
    id: "ORD-1047",
    customer: "Jordan T.",
    items: "Family Feast Combo ×1",
    total: 42000,
    status: "Out for delivery",
    time: "12 min ago",
    phone: "+1 555 0192",
  },
  {
    id: "ORD-1046",
    customer: "Sam K.",
    items: "Cheese Burst ×2",
    total: 32000,
    status: "Pending",
    time: "18 min ago",
    phone: "+1 555 0110",
  },
  {
    id: "ORD-1045",
    customer: "Alex Rivera",
    items: "Veggie Supreme ×1, Wings ×1",
    total: 26000,
    status: "Delivered",
    time: "41 min ago",
    phone: "+1 555 0177",
  },
  {
    id: "ORD-1044",
    customer: "Chris P.",
    items: "Meat Lovers ×1",
    total: 19000,
    status: "Cancelled",
    time: "1 hr ago",
    phone: "+1 555 0133",
  },
  {
    id: "ORD-1043",
    customer: "Nina L.",
    items: "Couple Combo ×1, Drinks ×2",
    total: 30000,
    status: "Delivered",
    time: "1 hr ago",
    phone: "+1 555 0155",
  },
];

export const ADMIN_CUSTOMERS: AdminCustomer[] = [
  {
    id: "CUS-01",
    name: "Maya R.",
    email: "maya@email.com",
    orders: 14,
    spent: 260000,
    joined: "Jan 2026",
  },
  {
    id: "CUS-02",
    name: "Jordan T.",
    email: "jordan@email.com",
    orders: 9,
    spent: 198000,
    joined: "Feb 2026",
  },
  {
    id: "CUS-03",
    name: "Sam K.",
    email: "sam@email.com",
    orders: 6,
    spent: 110000,
    joined: "Mar 2026",
  },
  {
    id: "CUS-04",
    name: "Alex Rivera",
    email: "alex@email.com",
    orders: 21,
    spent: 436000,
    joined: "Jan 2026",
  },
  {
    id: "CUS-05",
    name: "Nina L.",
    email: "nina@email.com",
    orders: 4,
    spent: 77000,
    joined: "Apr 2026",
  },
];

export const ADMIN_OFFERS = [
  {
    id: "OFF-01",
    title: "Family Feast 30% Off",
    code: "FAMILY30",
    status: "Active",
    ends: "Aug 31, 2026",
  },
  {
    id: "OFF-02",
    title: "Free Delivery 25,000 RWF+",
    code: "FREEDEL",
    status: "Active",
    ends: "Ongoing",
  },
  {
    id: "OFF-03",
    title: "Weekday Lunch Deal",
    code: "LUNCH12",
    status: "Scheduled",
    ends: "Sep 15, 2026",
  },
] as const;

export function statusTone(status: string) {
  switch (status) {
    case "Pending":
      return "bg-pam-gold-soft text-pam-ink";
    case "Preparing":
      return "bg-pam-red/10 text-pam-red";
    case "Out for delivery":
      return "bg-blue-50 text-blue-700";
    case "Delivered":
    case "Active":
      return "bg-pam-basil/10 text-pam-basil";
    case "Cancelled":
      return "bg-pam-sand text-pam-muted";
    case "Scheduled":
      return "bg-pam-sand text-pam-ink";
    case "Paused":
      return "bg-pam-sand text-pam-muted";
    default:
      return "bg-pam-sand text-pam-muted";
  }
}
