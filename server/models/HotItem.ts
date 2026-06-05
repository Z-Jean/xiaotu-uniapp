import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class HotItem extends Model {
  declare id: number
  declare title: string
  declare alt: string
  declare pictures: any
  declare target: string
  declare type: string
}

HotItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(100) },
    alt: { type: DataTypes.STRING(200) },
    pictures: { type: DataTypes.JSON },
    target: { type: DataTypes.STRING(200) },
    type: { type: DataTypes.STRING(50) },
  },
  {
    sequelize,
    tableName: 'hot_items',
    timestamps: false,
  },
)

export default HotItem
