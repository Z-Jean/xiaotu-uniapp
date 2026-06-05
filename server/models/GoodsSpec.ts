import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class GoodsSpec extends Model {
  declare id: number
  declare goods_id: number
  declare name: string
  declare values: any
}

GoodsSpec.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    goods_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(50) },
    values: { type: DataTypes.JSON },
  },
  {
    sequelize,
    tableName: 'goods_specs',
    timestamps: false,
  },
)

export default GoodsSpec
