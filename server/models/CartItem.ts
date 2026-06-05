import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class CartItem extends Model {
  declare id: number
  declare user_id: number
  declare sku_id: number
  declare count: number
  declare selected: number
}

CartItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    sku_id: { type: DataTypes.INTEGER, allowNull: false },
    count: { type: DataTypes.INTEGER, defaultValue: 1 },
    selected: { type: DataTypes.TINYINT, defaultValue: 1 },
  },
  {
    sequelize,
    tableName: 'cart_items',
    timestamps: false,
  },
)

export default CartItem
