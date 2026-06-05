import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class Goods extends Model {
  declare id: number
  declare name: string
  declare desc: string
  declare price: number
  declare old_price: number
  declare main_pictures: any
  declare details_pictures: any
  declare details_properties: any
  declare category_id: number
}

Goods.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    desc: { type: DataTypes.STRING(500) },
    price: { type: DataTypes.DECIMAL(10, 2) },
    old_price: { type: DataTypes.DECIMAL(10, 2) },
    main_pictures: { type: DataTypes.JSON },
    details_pictures: { type: DataTypes.JSON },
    details_properties: { type: DataTypes.JSON },
    category_id: { type: DataTypes.INTEGER },
  },
  {
    sequelize,
    tableName: 'goods',
    timestamps: false,
  },
)

export default Goods
