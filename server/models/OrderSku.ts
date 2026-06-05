import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class OrderSku extends Model {
  declare id: number
  declare order_id: number
  declare sku_id: number
  declare name: string
  declare image: string
  declare attrs_text: string
  declare quantity: number
  declare cur_price: number
}

OrderSku.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    sku_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(200) },
    image: { type: DataTypes.STRING(500) },
    attrs_text: { type: DataTypes.STRING(300) },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    cur_price: { type: DataTypes.DECIMAL(10, 2) },
  },
  {
    sequelize,
    tableName: 'order_skus',
    timestamps: false,
  },
)

export default OrderSku
