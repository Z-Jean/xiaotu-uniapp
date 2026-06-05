import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class Category extends Model {
  declare id: number
  declare name: string
  declare icon: string
}

Category.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    icon: { type: DataTypes.STRING(500) },
  },
  {
    sequelize,
    tableName: 'categories',
    timestamps: false,
  },
)

export default Category
