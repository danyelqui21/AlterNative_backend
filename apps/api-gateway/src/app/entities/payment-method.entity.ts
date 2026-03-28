import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  stripePaymentMethodId: string;

  @Column({ nullable: true })
  brand: string; // visa, mastercard, amex

  @Column({ nullable: true })
  last4: string;

  @Column({ nullable: true, type: 'int' })
  expMonth: number;

  @Column({ nullable: true, type: 'int' })
  expYear: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
