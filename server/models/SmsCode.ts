import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class SmsCode extends Model {
  declare id: number
  declare mobile: string
  declare code: string
  declare purpose: string
  declare expires_at: Date
  declare used: number
  declare created_at: Date
}

SmsCode.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    mobile: { type: DataTypes.STRING(20), allowNull: false },
    code: { type: DataTypes.STRING(10), allowNull: false },
    purpose: { type: DataTypes.STRING(20), defaultValue: 'login' },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used: { type: DataTypes.TINYINT, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'sms_codes',
    timestamps: false,
  },
)

export default SmsCode
