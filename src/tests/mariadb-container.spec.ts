import { MariadbContainer, StartedMariadbContainer } from '../mariadb-container'

describe('Mariadb Container Test', () => {
  let mariadb: StartedMariadbContainer

  beforeAll(async () => {
    mariadb = await new MariadbContainer().start()
  })

  afterAll(async () => {
    await mariadb.closeDatabase()
  })

  it('should return whoami result', async () => {
    const whoamiResult = await mariadb.exec(['whoami'])

    expect(whoamiResult.exitCode).toBe(0)
    expect(whoamiResult.output.trim()).toBe('root')
  })

  it('should return version when call mariadb binary file with --version', async () => {
    const versionResult = await mariadb.exec(['mariadb', '--version'])
    expect(versionResult.exitCode).toBe(0)
    expect(versionResult.output.trim()).toBeTruthy()
  })

  it('should return mapping port of MARIA_PORT (3306)', async () => {
    const port = mariadb.getPort()
    expect(port).toBeTruthy()
  })

  it('live check', async () => {
    const isAlive = await mariadb.isLive()
    expect(isAlive).toBe(true)
  })

  it('show SELECT VERSION()', async () => {
    const version = await mariadb.executeQuery('SELECT VERSION()')
    expect(version).toBeTruthy()
  })

  it('show return connections pool of the mariadb', async () => {
    const pool = mariadb.getPool()
    expect(pool).toBeTruthy()
  })
})
