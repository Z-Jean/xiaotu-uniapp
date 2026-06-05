import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class Address extends Model {
  declare id: number
  declare user_id: number
  declare receiver: string
  declare contact: string
  declare province_code: string
  declare city_code: string
  declare county_code: string
  declare full_location: string
  declare address: string
  declare is_default: number
}

Address.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    receiver: { type: DataTypes.STRING(50), allowNull: false },
    contact: { type: DataTypes.STRING(20), allowNull: false },
    province_code: { type: DataTypes.STRING(10) },
    city_code: { type: DataTypes.STRING(10) },
    county_code: { type: DataTypes.STRING(10) },
    full_location: { type: DataTypes.STRING(200) },
    address: { type: DataTypes.STRING(300) },
    is_default: { type: DataTypes.TINYINT, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'addresses',
    timestamps: false,
  },
)

export default Address
