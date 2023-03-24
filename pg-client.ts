/**
 * Project:     @rokit-js/pg-client
 * File:        pg-client.js
 * Description: Utilities:
 *               - connect: create a DB connection with transaction methods:
 *                           - begin;
 *                           - rollback;
 *                           - commit.
 */

import pg from 'pg';

const DEFAULT_HOST   = '0.0.0.0'; // Default DB host if not specified in the environment
const DEFAULT_PORT   = '5432';    // Default DB port if not specified in the environment
const TERMINATE_POOL = true;

type TypeDbEnvVarDef          = { prop:string, default?: string, sensitive?: boolean };
type TypeDbEnvVarConfig       = { [key:string] : TypeDbEnvVarDef };

type TypeEnvVarConfig       = { [key:string] : string };
type TypeEnvVarStoredConfig = { [key:string] : string | undefined };

type TypeAdditionPoolClient = {
  begin:    () => Promise<void>,
  commit:   () => Promise<void>,
  rollback: () => Promise<void>,
};
type TypePoolClient = pg.PoolClient & TypeAdditionPoolClient;

type TypePool = {
  connect : () => Promise<TypePoolClient>,
  end :     () => Promise<void>,
};

type TypeNullablePool = TypePool | null;

type TypeCustomPool = {
  close : () => Promise<TypeNullablePool>,
};

/**
 * The mandatory environment variables for this module.
 * Property names are the environment variable names.
 * Values are an object with properties:
 *  - prop:    the property name required for the pg module pool creation;
 *  - default: optional default value to use if the environment variable is not defined.
 */
const MANDATORY_ENV_VARS : TypeDbEnvVarConfig = {
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
 const OPTIONAL_ENV_VARS : TypeDbEnvVarConfig = { 
  'PG_MAX_CLIENT':      { prop: 'max' ,                    }, // pg default is 10
  'PG_IDLE_TIMEOUT_MS': { prop: 'idleTimeoutMillis',       }, // pg default is 10000
  'PG_CNXN_TIMEOUT_MS': { prop: 'connectionTimeoutMillis', }, // pg default is 0
} ;

/**
 * @param {Object}   overrideVars : object with properties being the environment variable name and values being the override value; 
 * @return object with properties being the environment variables that have been overridden and values being the old values or null if the variable did not exist.
 */
 function overrideEnvVars( overrideVars : TypeEnvVarConfig = {} ) {
  const originalVars : TypeEnvVarStoredConfig = {};

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
function restoreEnvVars( modifiedVars : TypeEnvVarStoredConfig = {} ) {

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
type TypeGetConfigProps = { returnSensitive?: boolean, dbConfig?: TypeEnvVarConfig };
function getConfig( { returnSensitive = false, dbConfig = {} } : TypeGetConfigProps = {} ) : TypeEnvVarStoredConfig {

  const envConfig : TypeEnvVarStoredConfig = {};

  const originalEnvVars = overrideEnvVars( dbConfig );

  const processDbEnvVars = ( dbEnvVars : TypeDbEnvVarConfig ) => {
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
 function getPoolConfig( dbConfig : TypeEnvVarConfig = {} ) {

  const envConfig  = getConfig( { returnSensitive: true, dbConfig } ) ;
  const poolConfig : TypeEnvVarConfig = {} ;

  const processEnvVars = ( { envVars, errorIfMissing } : { envVars: TypeDbEnvVarConfig, errorIfMissing : boolean } ) => {
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
type TypeGetCreatePoolClosureRet = ( terminate?: boolean ) => Promise<(TypeNullablePool)>;
function getCreatePoolClosure( dbConfig = {} ) : TypeGetCreatePoolClosureRet {
  let pool : TypeNullablePool = null ;

  return async ( terminate = false ) => {
    let result : TypeNullablePool = null ;
    if ( terminate === TERMINATE_POOL ) {
      if ( pool ) {
        await pool.end();
      }
      pool = null ;
    } else if ( pool ) {
      result = pool ;
    } else {
      const poolConfig = getPoolConfig( dbConfig ) ;
      const tmpPool    = new pg.Pool( poolConfig ) as unknown;
      pool             = tmpPool as TypeNullablePool;
      result           = pool;
    }
    return result ;
  };
}

/**
 * @return function that returns a configured pg.Pool object
 */
const getPool = getCreatePoolClosure();

/**
 * @param pool - DB pool object, if not specified the current pool is used or if no current pool exists a new pool is created.
 * @return connected client database object with additional methods: begin, commit, rollback.
 * @exception if an error occurs.
 */
async function connect( pool : TypeNullablePool = null ) : Promise<TypePoolClient> {
  pool = pool || await getPool();
  // pool is guaranteed to be set here, getPool shall throw an exception if it fails
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const client        = await pool!.connect();
  const arrMethodName = [ 'begin', 'commit', 'rollback' ] ;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Adding new methods to the client
  arrMethodName.forEach( methodName => client[ methodName ] = () => client.query( methodName ) ) ;
  return client ;
}

/**
 * Terminates the connection pool.
 * @return a promise to terminate the pool.
 */
async function end() {
  return await getPool( TERMINATE_POOL ) ;
}

/**
 * @returns a new connection pool object that the caller must manage.
 */
async function createCustomPool( dbConfig : TypeEnvVarConfig ) : Promise<TypeCustomPool> {
  const getCustomPool = getCreatePoolClosure( dbConfig ) ;
  const rawCustomPool = await getCustomPool() as unknown;
  const customPool    = rawCustomPool as TypeCustomPool;
  customPool.close    = async () => await getCustomPool( TERMINATE_POOL ) as null;
  return customPool;
}

export default {
  connect,
  end,
  createCustomPool,
  getConfig,
} ;
