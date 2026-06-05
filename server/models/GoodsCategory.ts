import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class GoodsCategory extends Model {
  declare id: number
  declare parent_id: number
  declare name: string
  declare picture: string
  declare image_banners: any
}

GoodsCategory.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    parent_id: { type: DataTypes.INTEGER, defaultValue: 0 },
    name: { type: DataTypes.STRING(50), allowNull: false },
    picture: { type: DataTypes.STRING(500) },
    image_banners: { type: DataTypes.JSON },
  },
  {
    sequelize,
    tableName: 'goods_categories',
    timestamps: false,
  },
)

export default GoodsCategory
