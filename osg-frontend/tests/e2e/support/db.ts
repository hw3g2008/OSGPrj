/**
 * 5 端 13 Stage 门禁专用 MySQL 直连 helper。
 *
 * 防糊弄设计：
 * - 返回的 row 原始数据落 evidence 文件，spec 不可在内存改值后伪造
 * - 单 connection 串行执行，避免并发竞态
 * - 连接信息走 env，不写死，便于 CI 替换
 */
import mysql from 'mysql2/promise'

const DB_HOST = process.env.GATE_DB_HOST || '47.94.213.128'
const DB_PORT = Number(process.env.GATE_DB_PORT || 23306)
const DB_USER = process.env.GATE_DB_USER || 'ruoyi'
const DB_PASSWORD = process.env.GATE_DB_PASSWORD || 'app123456'
const DB_NAME = process.env.GATE_DB_NAME || 'ry-vue'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 4,
      charset: 'utf8mb4',
    })
  }
  return pool
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params)
  return rows as T[]
}

export async function dbQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await dbQuery<T>(sql, params)
  return rows[0] ?? null
}

export async function dbExec(sql: string, params: any[] = []): Promise<number> {
  const [result] = await getPool().execute(sql, params)
  return (result as mysql.ResultSetHeader).affectedRows
}

export async function dbClose(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

/**
 * Spec 调用此函数把每条 DB query + 结果写入 evidence 文件。
 * Evidence 目录由 gateRunner 注入。
 */
export async function dbAssertWithEvidence(
  evidenceDir: string,
  stageId: string,
  assertionName: string,
  sql: string,
  params: any[] = [],
): Promise<any[]> {
  const rows = await dbQuery(sql, params)
  const fs = await import('node:fs')
  const path = await import('node:path')
  fs.mkdirSync(evidenceDir, { recursive: true })
  const evidenceFile = path.join(evidenceDir, `${stageId}-${assertionName}.json`)
  fs.writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        stage: stageId,
        assertion: assertionName,
        sql: sql.trim(),
        params,
        rows,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
  return rows
}

/**
 * 跑测前 reset fixture 到 baseline.preFixture 描述的状态。
 * 包括清旧 class_record / mock_practice / coaching 重置。
 *
 * SAFETY: 只删 mentor_id=12866 + student_id=25112 + 标识 marker 含 'gate' 或 '手测'
 * 的测试数据。生产数据不会被碰。
 */
export async function resetGateFixture(): Promise<void> {
  // 1. 删本次门禁产生的 mock_practice (按 content marker)
  await dbExec(
    `DELETE FROM osg_mock_practice WHERE request_content IN ('gate B-Flow mock practice', '手测 B-Flow mock practice')`,
  )

  // 2. 删本次门禁产生的 class_record (mentor=12866 student=25112，referencing 5221 / 当前 mock)
  await dbExec(
    `DELETE FROM osg_class_record
     WHERE student_id=25112 AND mentor_id=12866
       AND (reference_id=5221
            OR reference_id IN (SELECT practice_id FROM osg_mock_practice WHERE student_id=25112 AND request_content LIKE '%gate%'))`,
  )

  // 3. coaching 5221 全字段重置（含 mentor_name/mentor_names，上次发现的坑）
  await dbExec(
    `UPDATE osg_coaching
     SET mentor_ids=NULL, mentor_name=NULL, mentor_names=NULL,
         status='pending', update_time=NOW(), update_by='gate_reset'
     WHERE coaching_id=5221`,
  )

  // 4. 验证 reset 结果（自身门禁）
  const coaching = await dbQueryOne<{ mentor_ids: string | null; mentor_name: string | null; status: string }>(
    `SELECT mentor_ids, mentor_name, status FROM osg_coaching WHERE coaching_id=5221`,
  )
  if (!coaching || coaching.mentor_ids !== null || coaching.mentor_name !== null || coaching.status !== 'pending') {
    throw new Error(`fixture reset failed: coaching 5221 still ${JSON.stringify(coaching)}`)
  }
}
