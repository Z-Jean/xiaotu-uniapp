import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class GoodsSku extends Model {
  declare id: number
  declare goods_id: number
  declare sku_code: string
  declare price: number
  declare old_price: number
  declare inventory: number
  declare picture: string
  declare specs: any
}

GoodsSku.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    goods_id: { type: DataTypes.INTEGER, allowNull: false },
    sku_code: { type: DataTypes.STRING(100) },
    price: { type: DataTypes.DECIMAL(10, 2) },
    old_price: { type: DataTypes.DECIMAL(10, 2) },
    inventory: { type: DataTypes.INTEGER, defaultValue: 0 },
    picture: { type: DataTypes.STRING(500) },
    specs: { type: DataTypes.JSON },
  },
  {
    sequelize,
    tableName: 'goods_skus',
    timestamps: false,
  },
)

export default GoodsSku
