-- 合同状态脏数据修正：把遗留的 'normal' 状态规整为 'active'
-- 背景：早期版本 osg_contract.contract_status 默认值为 'normal'，
-- 后续 init schema 改为 active/expired/cancelled 三态，旧数据未迁移导致
-- 前端筛选漏掉这部分记录。该脚本幂等可重跑。

UPDATE osg_contract SET contract_status = 'active' WHERE contract_status = 'normal';
