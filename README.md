# Overview
Module that provides a client connection with transaction support to a PostgresSQL database.

# Usage

## Environment Variables

| Variable            | Description                        | Default   |
|---------------------|------------------------------------|-----------|
| PGHOST              | DB hostname                        | ::1       |
| PGPORT              | DB port                            | 5432      |
| PGDATABASE          | DB name                            |           |
| PGUSER              | DB username                        |           |
| PGPASSWORD          | DB password                        |           |
| PG_MAX_CLIENT       | Maximum number of open connections | 10        |
| PG_IDLE_TIMEOUT_MS  | Idle timeout in milliseconds       | 10000     |
| PG_CNXN_TIMEOUT_MS  | Connection timeout in milliseconds | 0         |

<br>The idle timeout closes an open connection after the specified period of inactivity.
<br>A connect request shall fail if the maximum number of connections are still in use after the specified connection timeout.

## Example Usage

    const { connect, end } = require( '@rhoweb.js/pg-client');

    const dbClient = await connect();
    . . .
    do stuff with the DB client
    . . .
    await dbClient.release();

    // When closing down
    await end(); // Terminate the connection pool

# Methods

## connect

Create a client connection object.

    const dbClient = await pgClient.connect( customPool = null );

Defaults to the regular pool if no argument is specified.

Exceptions shall be thrown if:
  - any of the required environment variables are not defined (i.e., the ones without default values);
  - the specified environment variables are invalid or do not define a valid connection;
  - if it is not possible to connect the database for any reason;
  - if the maximumum number of active client connections are currently in use.

## end

Terminate the DB connection pool.

    async pgClient.end();

<br>Call this to terminate the connection pool when shutting down the application.
<br>If this is not called, the connection pool shall terminate automatically after about 5 seconds.

## createCustomPool

    const customPool = await pgClient.createCustomPool();

Create a new connection pool configured from different environment variables.
<br>The custom pool must be explicitly closed by the caller.

    ... updated environment variables ...
    const customPool = await pgClient.createCustomPool();
    const dbClient   = await pgClient.connect( customPool );
    ... do stuff ...
    await dbClient.release();
    await customPool.close();

### Regular Pool and Custom Pool

Custom pools are used for non-standard use cases, typically administrative.
<br>The regular connection pool is created when "connect()" is first called.
<br>If "connect()" has not yet been called, changing the environment variables dynamically shall result in the regular connection pool being configured incorrectly, e.g.,

    process.env.PG_IDLE_TIMEOUT_MS = 0;
    const customPool = await pgClient.createCustomPool();
    . . .
    await pgClient.connect();
    . . .

Either restore the modified environment variables, e.g.,

    const oldTimeout = process.env.PG_IDLE_TIMEOUT_MS;
    process.env.PG_IDLE_TIMEOUT_MS = 0;
    const customPool = await pgClient.createCustomPool();
    process.env.PG_IDLE_TIMEOUT_MS = oldTimeout;
    . . .

or connect and disconnect a regular client first, e.g.,

    await pgClient.connect();
    await pgClient.release();
    process.env.PG_IDLE_TIMEOUT_MS = 0;
    const customPool = await pgClient.createCustomPool();
    . . .

## getConfig
Returns the configuration as loaded from the environment, e.g.,

    const pgConfig = pgClient.getConfig();

would return something like:

    {
      PGHOST:              'pghost.com',
      PGPORT:              '5432',
      PGDATABASE:          'pgdb',
      PGUSER:              'pguser',
      PGPASSWORD:          'pgpass'
      PG_MAX_CLIENT:       null,
      PG_IDLE_TIMEOUT_MS': null,
      PG_CNXN_TIMEOUT_MS': null,
    }


# Run Tests

Either define the DB environment variables or modify the defaults defined in test/unit/pg-client.js.

    export PGHOST=myhost
    export PGPORT=5432
    export PGDATABASE=mydb
    export PGUSER=myuser
    export PGPASSWORD=mypassword
    npm install
    npm install mocha --global
    npm run test
    npm run test-coverage
    