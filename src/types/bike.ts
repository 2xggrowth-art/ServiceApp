export interface Bike {
  id: string;
  customerId: string;
  bikeModel: string;
  registrationNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}
