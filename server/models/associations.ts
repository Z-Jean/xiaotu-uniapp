/**
 * Sequelize 模型关联定义
 * 在 app.ts 启动时导入一次即可
 */
import CartItem from './CartItem'
import GoodsSku from './GoodsSku'
import Goods from './Goods'

// 购物车项 → SKU（通过 sku_id）
CartItem.belongsTo(GoodsSku, { foreignKey: 'sku_id', as: 'sku' })

// SKU → 商品（通过 goods_id）
GoodsSku.belongsTo(Goods, { foreignKey: 'goods_id', as: 'goods' })

// SKU → 商品（反向：一个商品有多个 SKU）
Goods.hasMany(GoodsSku, { foreignKey: 'goods_id', as: 'skus' })
