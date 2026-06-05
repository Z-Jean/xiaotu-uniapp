import { DataTypes, Model } from 'sequelize'
import sequelize from '../config/db'

class Banner extends Model {
  declare id: number
  declare img_url: string
  declare href_url: string
  declare type: number
  declare distribution_site: number
}

Banner.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    img_url: { type: DataTypes.STRING(500), allowNull: false },
    href_url: { type: DataTypes.STRING(200) },
    type: { type: DataTypes.TINYINT, defaultValue: 1 },
    distribution_site: { type: DataTypes.TINYINT, defaultValue: 1 },
  },
  {
    sequelize,
    tableName: 'banners',
    timestamps: false,
  },
)

export default Banner
