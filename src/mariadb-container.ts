import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { AbstractStartedContainer } from 'testcontainers/dist/modules/abstract-started-container'
import { LogWaitStrategy } from 'testcontainers/dist/wait-strategy'

import * as mariadb from 'mariadb'

const MARIADB_PORT = 3306
const DEFAULT_STARTUP_TIMEOUT = 120_000

type Port = number

export class MariadbContainer extends GenericContainer {
  private database = 'test'
  private username = 'user'
  private userPassword = 'userPassword'
  private rootPassword = 'rootPassword'
  private waitingLog = `socket: '/run/mysqld/mysqld.sock'  port: 3306  mariadb.org binary distribution`

  constructor(image: string = 'mariadb:10.8.3') {
    super(image)
  }
  public withDatabase(database: string): this {
    this.database = database
    return this
  }

  public withUsername(username: string): this {
    this.username = username
    return this
  }

  public withRootPassword(rootPassword: string): this {
    this.rootPassword = rootPassword
    return this
  }

  public withUserPassword(userPassword: string): this {
    this.userPassword = userPassword
    return this
  }

  public async start(): Promise<StartedMariadbContainer> {
    this.withWaitStrategy(new LogWaitStrategy(this.waitingLog))
      .withExposedPorts(MARIADB_PORT)
      .withEnv('MARIADB_DATABASE', this.database)
      .withEnv('MARIADB_ROOT_PASSWORD', this.rootPassword)
      .withEnv('MARIADB_USER', this.username)
      .withEnv('MARIADB_PASSWORD', this.userPassword)
      .withStartupTimeout(DEFAULT_STARTUP_TIMEOUT)

    const startedTestContainer = await super.start()

    return new StartedMariadbContainer(
      startedTestContainer,
      this.database,
      this.username,
      this.userPassword,
      this.rootPassword
    )
  }
}

export class StartedMariadbContainer extends AbstractStartedContainer {
  private readonly port: Port
  private pool: mariadb.Pool

  constructor(
    startedTestContainer: StartedTestContainer,
    private readonly database: string,
    private readonly username: string,
    private readonly userPassword: string,
    private readonly rootPassword: string
  ) {
    super(startedTestContainer)
    this.port = startedTestContainer.getMappedPort(MARIADB_PORT)
    this.pool = mariadb.createPool({
      host: startedTestContainer.getHost(),
      port: this.port,
      user: this.username,
      password: this.userPassword,
      connectionLimit: 10
    })
  }

  public async closeDatabase() {
    await this.pool.end()
    await this.stop()
  }

  public async clearDatabase(database: string) {
    const result = await this.pool.execute(`DROP DATABASE ${database}`)
    return result
  }

  public async runCmd(command: string): Promise<string> {
    const commandArray = command.split(' ')
    const execResult = await this.exec(commandArray)
    if (execResult.exitCode === 0) {
      return Promise.resolve(execResult.output.trim())
    } else {
      return Promise.reject(execResult.output.trim())
    }
  }

  public getPort(): Port {
    return this.port
  }

  public getDatabase(): string {
    return this.database
  }

  public getUsername(): string {
    return this.username
  }

  public getUserPassword(): string {
    return this.userPassword
  }

  public getRootPassword(): string {
    return this.rootPassword
  }

  public getPool(): mariadb.Pool {
    return this.pool
  }

  public async isLive() {
    const result = await this.runCmd(`mariadb-admin ping -h 127.0.0.1 -u root -p${this.rootPassword}`)
    return result.includes('is alive')
  }

  public async executeQuery(sql: string): Promise<string> {
    return await this.pool.query(sql)
  }
}
