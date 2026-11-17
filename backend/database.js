import mysql from 'mysql2/promise'
import { config } from './config.js'

function safeValues(sql, values) {
  if (!Array.isArray(values)) return values
  const safe = values.map((v) => (v === undefined ? null : v))
  if (typeof sql === 'string') {
    if (sql.includes('INSERT INTO customers') && !safe[0]) {
      safe[0] = 'CUST-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    }
    if (sql.includes('INSERT INTO staff') && !safe[0]) {
      safe[0] = 'STAFF-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    }
    if (sql.includes('INSERT INTO rewards') && !safe[0]) {
      safe[0] = 'REW-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    }
  }
  return safe
}

const rawPool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'Z',
})

const origPoolExecute = rawPool.execute.bind(rawPool)
rawPool.execute = (sql, values) => origPoolExecute(sql, safeValues(sql, values))

export const pool = rawPool

export async function withTransaction(operation) {
  const connection = await pool.getConnection()
  const origExecute = connection.execute.bind(connection)
  connection.execute = (sql, values) => origExecute(sql, safeValues(sql, values))
  try {
    await connection.beginTransaction()
    const result = await operation(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
