import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class Order extends Model {
  declare id: number
  declare order_no: string
  declare user_id: number
  declare order_state: number
  declare address_snapshot: any
  declare total_money: number
  declare post_fee: number
  declare pay_money: number
  declare buyer_message: string
  declare delivery_time_type: number
  declare pay_type: number
  declare pay_channel: number
  declare countdown: number
  declare receiver_contact: string
  declare receiver_mobile: string
  declare receiver_address: string
  declare created_at: Date
}

Order.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_no: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    order_state: { type: DataTypes.TINYINT, defaultValue: 1 },
    address_snapshot: { type: DataTypes.JSON },
    total_money: { type: DataTypes.DECIMAL(10, 2) },
    post_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    pay_money: { type: DataTypes.DECIMAL(10, 2) },
    buyer_message: { type: DataTypes.STRING(500) },
    delivery_time_type: { type: DataTypes.TINYINT, defaultValue: 1 },
    pay_type: { type: DataTypes.TINYINT, defaultValue: 1 },
    pay_channel: { type: DataTypes.TINYINT, defaultValue: 2 },
    countdown: { type: DataTypes.INTEGER, defaultValue: 1800 },
    receiver_contact: { type: DataTypes.STRING(50) },
    receiver_mobile: { type: DataTypes.STRING(20) },
    receiver_address: { type: DataTypes.STRING(300) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: false,
  },
)

export default Order
