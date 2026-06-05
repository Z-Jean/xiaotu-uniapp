import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class User extends Model {
  declare id: number
  declare account: string
  declare password: string
  declare nickname: string
  declare avatar: string
  declare mobile: string
  declare gender: '男' | '女' | null
  declare birthday: string | null
  declare profession: string
  declare full_location: string
  declare province_code: string
  declare city_code: string
  declare county_code: string
  declare created_at: Date
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    account: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    nickname: { type: DataTypes.STRING(50) },
    avatar: { type: DataTypes.STRING(500) },
    mobile: { type: DataTypes.STRING(20) },
    gender: { type: DataTypes.ENUM('男', '女'), defaultValue: null },
    birthday: { type: DataTypes.DATEONLY, defaultValue: null },
    profession: { type: DataTypes.STRING(50), defaultValue: null },
    full_location: { type: DataTypes.STRING(200), defaultValue: null },
    province_code: { type: DataTypes.STRING(10), defaultValue: null },
    city_code: { type: DataTypes.STRING(10), defaultValue: null },
    county_code: { type: DataTypes.STRING(10), defaultValue: null },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false,
  },
)

export default User
