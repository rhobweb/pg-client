/**
 * Project:     @rokit-js/pg-client
 * File:        pg-client.js
 * Description: Utilities:
 *               - connect: create a DB connection with transaction methods:
 *                           - begin;
 *                           - rollback;
 *                           - commit.
 */

const pg = require( 'pg' );

const DEFAULT_HOST   = '0.0.0.0'; // Default DB host if not specified in the environment
const DEFAULT_PORT   = '5432';    // Default DB port if not specified in the environment
const TERMINATE_POOL = true;

/**
 * The mandatory environment variables for this module.
 * Property names are the environment variable names.
 * Values are an object with properties:
 *  - prop:    the property name required for the pg module pool creation;
 *  - default: optional default value to use if the environment variable is not defined.
 */
const MANDATORY_ENV_VARS = {
  'PGHOST':     { prop: 'host',     default: DEFAULT_HOST },
  'PGPORT':     { prop: 'port',     default: DEFAULT_PORT },
  'PGDATABASE': { prop: 'database',                       },
  'PGUSER':     { prop: 'user',                           },
  'PGPASSWORD': { prop: 'password', sensitive: true       },
} ;

/**
 * The optional environment variables for this module.
 * Property names are the environment variable names.
 * Values are an object with properties:
 *  - prop: the property name required for the pg module pool creation;
 */
 const OPTIONAL_ENV_VARS = { 
  'PG_MAX_CLIENT':      { prop: 'max' ,                    }, // pg default is 10
  'PG_IDLE_TIMEOUT_MS': { prop: 'idleTimeoutMillis',       }, // pg default is 10000
  'PG_CNXN_TIMEOUT_MS': { prop: 'connectionTimeoutMillis', }, // pg default is 0
} ;

/**
 * @param {Object}   overrideVars : object with properties being the environment variable name and values being the override value; 
 * @return object with properties being the environment variables that have been overridden and values being the old values or null if the variable did not exist.
 */
 function overrideEnvVars( overrideVars = {} ) {
  const originalVars = {};

  Object.entries( overrideVars ).forEach( ( [ envVar, value ] ) => {
    if ( ( process.env[ envVar ] === undefined ) || ( process.env[ envVar ] !== value ) ) {
      originalVars[ envVar ] = process.env[ envVar ];
      process.env[ envVar ]  = value;
    }
  } ) ;

  return originalVars ;
}

/**
 * @param {Object} modifiedVars : object with properties being the environment variable name and values being the value to restore. 
 */
function restoreEnvVars( modifiedVars = {} ) {

  Object.entries( modifiedVars ).forEach( ( [ envVar, value ] ) => {
    if ( value !== undefined ) {
      process.env[ envVar ] = value;
    } else {
      delete process.env[ envVar ];
    }
  } ) ;
}

/**
 * @param {Object} with properties:
 *                  - returnSensitive: if true return dummy values for sensitive variables.
 *                  - dbConfig:        optional DB environment variables configuration
 * @return object with properties being the environment variables and values being the real or default value for that variable.
 */
function getConfig( { returnSensitive = false, dbConfig = {} } = {} ) {

  const envConfig = {};

  const originalEnvVars = overrideEnvVars( dbConfig );

  const processDbEnvVars = ( dbEnvVars ) => {
    Object.entries( dbEnvVars ).forEach( ([ varName, varConfig ]) => {
      if ( ( ! varConfig.sensitive ) || returnSensitive ) {
        envConfig[ varName ] = process.env[ varName ] || varConfig.default || undefined;
      } else {
        envConfig[ varName ] = '<********>';
      }
    }) ;
  } ;

  processDbEnvVars( MANDATORY_ENV_VARS ) ;
  processDbEnvVars( OPTIONAL_ENV_VARS  ) ;

  restoreEnvVars( originalEnvVars ) ;

  return envConfig ;
}

/**
 * @param {Object} dbConfig: optional DB environment variables configuration
 * @return an object used to call the pg.Pool constructor with.
 */
function getPoolConfig( dbConfig = {} ) {

  const envConfig  = getConfig( { returnSensitive: true, dbConfig } ) ;
  const poolConfig = {} ;

  const processEnvVars = ( { envVars, errorIfMissing } ) => {
    Object.entries( envVars ).forEach( ( [ varName, varConfig ] ) => {
      const varValue = envConfig[ varName ];
      if ( varValue !== undefined ) {
        poolConfig[ varConfig.prop ] = varValue ;
      } else if ( errorIfMissing ) {
        throw new Error( `Environment variable not defined: ${varName}` ) ;
      }
    });
  };

  processEnvVars( { envVars: MANDATORY_ENV_VARS, errorIfMissing: true } ) ;
  processEnvVars( { envVars: OPTIONAL_ENV_VARS,  errorIfMissing: false } ) ;

  return poolConfig ;
}

/**
 * @param  {Object} dbConfig : optional parameter that contains the DB connection data with properties being the PG environment variables.
 * @return closure that returns the DB connection pool object created from the environment and configuration;
 *         closure takes a parameter that if not false terminates the pool.
 */
function getCreatePoolClosure( dbConfig = {} ) {
  let pool = null;

  return async ( terminate = false ) => {
    let result = null;
    if ( terminate === TERMINATE_POOL ) {
      if ( pool ) {
        await pool.end();
        pool = null;
      }
    } else if ( pool ) {
      result = pool;
    } else {
      const poolConfig = getPoolConfig( dbConfig );
      pool             = new pg.Pool( poolConfig );
      result           = pool;
    }
    return result;
  };
}

/**
 * @return function that returns a configured pg.Pool object
 */
const getPool = getCreatePoolClosure();

/**
 * @param pool - DB pool object, if not specified the current pool is used or if no current pool exists a new pool is created.
 * @return promise to return a connected client database object with additional methods: begin, commit, rollback.
 * @exception if an error occurs.
 */
async function connect( pool ) {
  pool = pool || await getPool();
  // pool is guaranteed to be set here, getPool shall throw an exception if it fails
  const client        = await pool.connect();
  const arrMethodName = [ 'begin', 'commit', 'rollback' ] ;
  arrMethodName.forEach( methodName => client[ methodName ] = () => client.query( methodName ) ) ;
  return client ;
}

/**
 * Terminates the connection pool.
 * @return a promise to terminate the pool.
 */
function end() {
  return getPool( TERMINATE_POOL ) ;
}

/**
 * @returns a promise to return a new connection pool object that the caller must manage.
 */
async function createCustomPool( dbConfig ) {
  const getCustomPool = getCreatePoolClosure( dbConfig ) ;
  const customPool    = await getCustomPool();
  customPool.close    = async () => await getCustomPool( TERMINATE_POOL );
  return customPool;
}

module.exports = {
  getConfig,
  connect,
  end,
  createCustomPool
};
