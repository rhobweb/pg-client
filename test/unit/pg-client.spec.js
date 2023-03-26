/**
 * DESCRIPTION:
 * Unit Tests for pg-client package.
 */

const sinon      = require( 'sinon' );
const { expect } = require( 'chai' );
const rewire     = require( 'rewire' );
//const rewiremock                         from 'rewiremock/node';

const REL_SRC_PATH = '../../';
const MODULE_NAME  = 'pg-client';
const TEST_MODULE  = REL_SRC_PATH + MODULE_NAME;


// Default DB connection values used if the environment variables are not defined
const DEFAULT_PGHOST             = 'test-PGHOST';
const DEFAULT_PGPORT             = 'test-PGPORT';
const DEFAULT_PGDATABASE         = 'test-PGDATABASE';
const DEFAULT_PGUSER             = 'test-PGUSER';
const DEFAULT_PGPASSWORD         = 'test-PGPASSWORD';
const DEFAULT_PG_MAX_CLIENT      = 'test-PG_MAX_CLIENT';
const DEFAULT_PG_IDLE_TIMEOUT_MS = 'test-PG_IDLE_TIMEOUT_MS';
const DEFAULT_PG_CNXN_TIMEOUT_MS = 'test-PG_CNXN_TIMEOUT_MS';
const OBSCURED_PASSWORD          = '<********>';

let sandbox;

//: SinonSandbox
//type TypeObject        = { [key:string] : any };
//type TypeRewiredModule = { [key:string] : any };
//type TypeEnvVarStoredConfig = { [key:string] : string | undefined };

/**
 * Modules load other modules, so to force a module reload need to delete
 * the test module and all child modules from the require cache.
 */
//function unrequireModules() {
//  const arrKey = [ require.resolve(TEST_MODULE),
//                   require.resolve(PG_MODULE),
//                 ];
//  for (let i in arrKey) {
//    let key = arrKey[i];
//    delete require.cache[key];
//  }
//}

function commonBeforeEach() {
  //unrequireModules();
  sandbox = sinon.createSandbox();
}

function commonAfterEach() {
  sandbox.restore();
  //unrequireModules();
}

function createTestModule() {
  const testModule = rewire( TEST_MODULE );
  return testModule;
}

function createTestModuleAndGetProps( arrProp = [] ) {
  const testModule = createTestModule();
  const testProps  = {};
  arrProp.forEach( m => { 
    testProps[ m ] = testModule.__get__( m );
  } );
  const result = { testModule, testProps };
  return result;
}

function getPrivateStubs( testModule, arrFnName = [] ) {
  const testStubs   = {};
  const testDummies = {};

  arrFnName.forEach( fnName => {
    testStubs[ fnName ]   = () => {};
    testDummies[ fnName ] = ( ...args ) => testStubs[ fnName ]( ...args );
    testModule.__set__( fnName, testDummies[ fnName ] );
  } );

  return testStubs;
}

describe(MODULE_NAME + ':module can be loaded', () => {

  beforeEach( () => {
    commonBeforeEach();
  });

  afterEach( () => {
    commonAfterEach();
  });

  it ('module initialises OK', () => {
    createTestModule();
  });
});

describe(MODULE_NAME + ':overrideEnvVars', () => {
  let testProps;
  let testFn;
  let testFnName = 'overrideEnvVars';
  let actualResult;
  let expectedResult;
  let testArgs;

  function checkResult( objEnv ) {
    Object.entries( objEnv ).forEach( ( [ envName, envVal ] ) => {
      expect( process.env[ envName ] ).to.equal( envVal );
      delete process.env[ envName ]; // Delete it now it has been checked
    } );
  }

  beforeEach( () => {
    commonBeforeEach();
    ( { testProps } = createTestModuleAndGetProps( [ testFnName ] ) );
    testFn   = testProps[ testFnName ];
    testArgs = {
      TEST_ENV_01: 'test-env-01',
      TEST_ENV_02: 'test-env-02',
      TEST_ENV_03: 'test-env-03',
    };
    expectedResult = {
      TEST_ENV_01: undefined,
      TEST_ENV_02: undefined,
      TEST_ENV_03: undefined,
    };
  });

  afterEach( () => {
    commonAfterEach();
  });

  it ('No overrides', () => {
    expectedResult = {};
    actualResult   = testFn();
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('OK none defined', () => {
    actualResult = testFn( testArgs );
    checkResult( testArgs );
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('Some already defined', () => {
    process.env[ 'TEST_ENV_01' ] = testArgs[ 'TEST_ENV_01' ];
    process.env[ 'TEST_ENV_02' ] = 'already-set-02';
    process.env[ 'TEST_ENV_03' ] = testArgs[ 'TEST_ENV_03' ];
    expectedResult = {
      TEST_ENV_02: process.env.TEST_ENV_02,
    };
    actualResult = testFn( testArgs );
    checkResult( testArgs );
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('OK all defined', () => {
    process.env.TEST_ENV_01 = 'already-set-01';
    process.env.TEST_ENV_02 = 'already-set-02';
    process.env.TEST_ENV_03 = 'already-set-03';
    expectedResult = {
      TEST_ENV_01: process.env.TEST_ENV_01,
      TEST_ENV_02: process.env.TEST_ENV_02,
      TEST_ENV_03: process.env.TEST_ENV_03,
    };
    actualResult = testFn( testArgs );
    checkResult( testArgs );
    expect( actualResult ).to.deep.equal( expectedResult );
  });
});

describe(MODULE_NAME + ':restoreEnvVars', () => {
  let testProps;
  let testFn;
  let testFnName = 'restoreEnvVars';
  let testArgs;

  function checkResult( objEnv ) {
    Object.entries( objEnv ).forEach( ( [ envName, envVal ] ) => {
      expect( process.env[ envName ] ).to.equal( envVal );
      delete process.env[ envName ]; // Delete it now it has been checked
    } );
  }

  beforeEach( () => {
    commonBeforeEach();
    ( { testProps } = createTestModuleAndGetProps( [ testFnName ] ) );
    testFn   = testProps[ testFnName ];
    process.env.TEST_ENV_01 = 'already-set-01';
    process.env.TEST_ENV_02 = 'already-set-03';
    process.env.TEST_ENV_03 = 'already-set-03';
    testArgs = {
      TEST_ENV_01: 'test-restored-env-01',
      TEST_ENV_02: 'test-restored-env-02',
      TEST_ENV_03: undefined,
    };
  });

  afterEach( () => {
    commonAfterEach();
  });

  it ('Nothing to restore', () => {
    testFn();
  });

  it ('OK', () => {
    testFn( testArgs );
    checkResult( testArgs );
  });
});

describe(MODULE_NAME + ':getConfig', () => {
  let testModule;
  let testFn;
  let testStubs;
  let testProps;
  let testArgs;
  let testDbConfig;
  let overrideEnvVarsStub;
  let overrideEnvVarsRet;
  let overrideEnvVarsExpectedArgs;
  let restoreEnvVarsStub;
  let restoreEnvVarsRet;
  let restoreEnvVarsExpectedArgs;
  let actualResult;
  let expectedResult;
  let arrEnvVarCreated;

  function stubEnvVar( varName, varValue ) { // Stub the environment variables if they don't exist
    if ( process.env[ varName ] === undefined ) {
      process.env[ varName ] = 'DUMMY';
      arrEnvVarCreated.push( varName );
      sandbox.stub( process.env, varName ).value( varValue );
    }
  }

  function deleteCreatedEnvVars() {
    arrEnvVarCreated.forEach( varName => {
      delete process.env[ varName ];
    } );
  }

  function defineEnvVars() {
    stubEnvVar( 'PGHOST',             DEFAULT_PGHOST             );
    stubEnvVar( 'PGPORT',             DEFAULT_PGPORT             );
    stubEnvVar( 'PGDATABASE',         DEFAULT_PGDATABASE         );
    stubEnvVar( 'PGUSER',             DEFAULT_PGUSER             );
    stubEnvVar( 'PGPASSWORD',         DEFAULT_PGPASSWORD         );
    stubEnvVar( 'PG_MAX_CLIENT',      DEFAULT_PG_MAX_CLIENT      );
    stubEnvVar( 'PG_IDLE_TIMEOUT_MS', DEFAULT_PG_IDLE_TIMEOUT_MS );
    stubEnvVar( 'PG_CNXN_TIMEOUT_MS', DEFAULT_PG_CNXN_TIMEOUT_MS );
  }
  
  beforeEach( () => {
    commonBeforeEach();
    ( { testModule, testProps } = createTestModuleAndGetProps( [ 'DEFAULT_HOST', 'DEFAULT_PORT' ] ) );
    testStubs                   = getPrivateStubs( testModule, [ 'overrideEnvVars', 'restoreEnvVars' ] );
    testFn                      = testModule.getConfig;
    testDbConfig = 'test dbConfig';
    testArgs     = {
      dbConfig: testDbConfig,
    };
    overrideEnvVarsStub = sandbox.stub( testStubs, 'overrideEnvVars' ).callsFake( () => {
      return overrideEnvVarsRet;
    } );
    overrideEnvVarsRet          = 'overrideEnvVars ret';
    overrideEnvVarsExpectedArgs = [ overrideEnvVarsStub, testDbConfig ];
    restoreEnvVarsStub = sandbox.stub( testStubs, 'restoreEnvVars' ).callsFake( () => {
      return restoreEnvVarsRet;
    } );
    restoreEnvVarsRet          = 'restoreEnvVars ret';
    restoreEnvVarsExpectedArgs = [ restoreEnvVarsStub, overrideEnvVarsRet ];
    arrEnvVarCreated = [];
    defineEnvVars();
    expectedResult = {
      PGHOST:             DEFAULT_PGHOST,
      PGPORT:             DEFAULT_PGPORT,
      PGDATABASE:         DEFAULT_PGDATABASE,
      PGUSER:             DEFAULT_PGUSER,
      PGPASSWORD:         DEFAULT_PGPASSWORD,
      PG_MAX_CLIENT:      DEFAULT_PG_MAX_CLIENT,
      PG_IDLE_TIMEOUT_MS: DEFAULT_PG_IDLE_TIMEOUT_MS,
      PG_CNXN_TIMEOUT_MS: DEFAULT_PG_CNXN_TIMEOUT_MS,
    };
  });

  afterEach( () => {
    commonAfterEach();
    deleteCreatedEnvVars();
    testModule = null;
  });

  it ('No DB config, hide password', () => {
    overrideEnvVarsExpectedArgs[ 1 ] = {};
    actualResult              = testFn();
    expectedResult.PGPASSWORD = OBSCURED_PASSWORD;
    sinon.assert.calledWithExactly.apply( null, overrideEnvVarsExpectedArgs );
    sinon.assert.calledWithExactly.apply( null, restoreEnvVarsExpectedArgs );
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('DB config, return password', () => {
    testArgs.returnSensitive = true;
    actualResult              = testFn( testArgs );
    sinon.assert.calledWithExactly.apply( null, overrideEnvVarsExpectedArgs );
    sinon.assert.calledWithExactly.apply( null, restoreEnvVarsExpectedArgs );
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('No DB config, default env values, return password', () => {
    testArgs.returnSensitive         = true;
    overrideEnvVarsExpectedArgs[ 1 ] = {};
    delete testArgs.dbConfig;
    delete process.env.PGHOST;
    delete process.env.PGPORT;
    delete process.env.PG_MAX_CLIENT;
    delete process.env.PG_IDLE_TIMEOUT_MS;
    delete process.env.PG_CNXN_TIMEOUT_MS;
    expectedResult = {
      PGHOST:             testProps.DEFAULT_HOST,
      PGPORT:             testProps.DEFAULT_PORT,
      PGDATABASE:         DEFAULT_PGDATABASE,
      PGUSER:             DEFAULT_PGUSER,
      PGPASSWORD:         DEFAULT_PGPASSWORD,
      PG_MAX_CLIENT:      undefined,
      PG_IDLE_TIMEOUT_MS: undefined,
      PG_CNXN_TIMEOUT_MS: undefined,
    };
    actualResult = testFn( testArgs );
    sinon.assert.calledWithExactly.apply( null, overrideEnvVarsExpectedArgs );
    sinon.assert.calledWithExactly.apply( null, restoreEnvVarsExpectedArgs );
    expect( actualResult ).to.deep.equal( expectedResult );
  });
});

describe(MODULE_NAME + ':getPoolConfig', () => {
  let testModule;
  let testProps;
  let testStubs;
  let testFn;
  let testFnName = 'getPoolConfig';
  let getConfigStub;
  let getConfigRet;
  let getConfigExpectedArgs;
  let actualErr;
  let actualResult;
  let expectedErrMessage;
  let expectedResult;
  let testArgs;
  let testDbConfig;

  beforeEach( () => {
    commonBeforeEach();
    ( { testModule, testProps } = createTestModuleAndGetProps( [ testFnName ] ) );
    testFn    = testProps[ testFnName ];
    testStubs = getPrivateStubs( testModule, [ 'getConfig' ] );
    testDbConfig = 'test dbConfig';
    testArgs  = {
      dbConfig: testDbConfig,
    };
    getConfigStub = sandbox.stub( testStubs, 'getConfig' ).callsFake( () => {
      return getConfigRet;
    } );
    getConfigRet = {
      PGHOST:             'test pghost',
      PGPORT:             'test pgport',
      PGDATABASE:         'test pgdatabase',
      PGUSER:             'test pguser',
      PGPASSWORD:         'test pgpassword',
      PG_MAX_CLIENT:      'test pgmaxclient',
      PG_IDLE_TIMEOUT_MS: 'test pgidletimeout',
      PG_CNXN_TIMEOUT_MS: 'test pgcnxntimeout',
    };
    getConfigExpectedArgs = [ getConfigStub, testDbConfig ];
    expectedResult = {
      host:                    getConfigRet.PGHOST,
      port:                    getConfigRet.PGPORT,
      database:                getConfigRet.PGDATABASE,
      user:                    getConfigRet.PGUSER,
      password:                getConfigRet.PGPASSWORD,
      connectionTimeoutMillis: getConfigRet.PG_CNXN_TIMEOUT_MS,
      idleTimeoutMillis:       getConfigRet.PG_IDLE_TIMEOUT_MS,
      max:                     getConfigRet.PG_MAX_CLIENT,
    };
  });

  afterEach( () => {
    commonAfterEach();
  });

  it ('OK, dbConfig', () => {
    try {
      actualResult = testFn( testArgs );
    }
    catch ( err ) {
      sinon.assert.fail( `Test should not fail: ${err.message}` );
    }
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('OK, no dbConfig, no optional envs', () => {
    getConfigExpectedArgs[ 1 ] = {};
    getConfigRet.PG_MAX_CLIENT      = undefined;
    getConfigRet.PG_IDLE_TIMEOUT_MS = undefined;
    getConfigRet.PG_CNXN_TIMEOUT_MS = undefined;
    delete expectedResult.max;
    delete expectedResult.connectionTimeoutMillis;
    delete expectedResult.idleTimeoutMillis;
    try {
      actualResult = testFn();
    }
    catch ( err ) {
      sinon.assert.fail( `Test should not fail: ${err.message}` );
    }
    expect( actualResult ).to.deep.equal( expectedResult );
  });

  it ('Missing PGHOST', () => {
    getConfigRet.PGHOST = undefined;
    expectedErrMessage = 'Environment variable not defined: PGHOST';
    try {
      testFn( testArgs );
      sinon.assert.fail( `Test should not succeed` );
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('Missing PGPORT', () => {
    getConfigRet.PGPORT = undefined;
    expectedErrMessage = 'Environment variable not defined: PGPORT';
    try {
      testFn( testArgs );
      sinon.assert.fail( `Test should not succeed` );
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('Missing PGDATABASE', () => {
    getConfigRet.PGDATABASE = undefined;
    expectedErrMessage = 'Environment variable not defined: PGDATABASE';
    try {
      testFn( testArgs );
      sinon.assert.fail( `Test should not succeed` );
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('Missing PGUSER', () => {
    getConfigRet.PGUSER = undefined;
    expectedErrMessage = 'Environment variable not defined: PGUSER';
    try {
      testFn( testArgs );
      sinon.assert.fail( `Test should not succeed` );
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('Missing PGPASSWORD', () => {
    getConfigRet.PGPASSWORD = undefined;
    expectedErrMessage = 'Environment variable not defined: PGPASSWORD';
    try {
      testFn( testArgs );
      sinon.assert.fail( `Test should not succeed` );
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });
});
// BEGIN: Mock the Pool object in the 'pg' module
/*
const PG_MODULE    = 'pg';


const testPoolDefault = {
  connect: async () => {},
  end:     async () => {},
};

let testPool : Pool = testPoolDefault;

const testPg = {
  Pool,
};

function setTestPool( newPool? : Pool ) {
  if ( newPool ) {
    testPool = newPool;
  } else {
    testPool = testPoolDefault;
  }
  return testPool;
}

// END: Mock the Pool object in the 'pg' module
*/

describe(MODULE_NAME + ':getCreatePoolClosure', () => {
  let testModule;
  let testProps;
  let testStubs;
  let testFn;
  let testFnName = 'getCreatePoolClosure';
  let getPoolConfigStub;
  let getPoolConfigRet;
  let getPoolConfigExpectedArgs;
  let testClosure;
  let actualResult;
  let expectedResult;
  let testArgs;
  let endStub;
  let endExpectedArgs;
  let testPool;

  beforeEach( () => {
    testPool = {
      end: () => {},
     };
    class Pool {
      constructor( params ) {
        testPool.params = params;
        return testPool;
      }
    }
    testPg = {
      Pool
    };
    commonBeforeEach();
    ( { testModule, testProps } = createTestModuleAndGetProps( [ testFnName ] ) );
    testFn    = testProps[ testFnName ];
    testStubs = getPrivateStubs( testModule, [ 'getPoolConfig' ] );
    testModule.__set__( 'pg', testPg );
    testArgs  = 'test dbConfig';
    getPoolConfigStub = sandbox.stub( testStubs, 'getPoolConfig' ).callsFake( () => {
      return getPoolConfigRet;
    } );
    getPoolConfigRet          = 'getPoolConfig ret';
    getPoolConfigExpectedArgs = [ getPoolConfigStub, testArgs ];
    endStub         = sandbox.stub( testPool, 'end' ).callsFake( () => {} ) ;
    endExpectedArgs = [ endStub ];
    expectedResult = testPool;
    Object.assign( expectedResult, testPool, { params: getPoolConfigRet } );
  });

  afterEach( () => {
    commonAfterEach();
  });

  it ('Get closure', () => {
    testClosure = testFn( testArgs );
    sinon.assert.notCalled( getPoolConfigStub );
    sinon.assert.notCalled( endStub );
    expect( typeof testClosure ).to.equal( 'function' );
  });

  it ('Call closure', async () => {
    testClosure    = testFn( testArgs );
    actualResult   = await testClosure();
    sinon.assert.calledWithExactly.apply( null, getPoolConfigExpectedArgs );
    sinon.assert.notCalled( endStub );
    expect( actualResult ).to.equal( expectedResult );
  });

  it ('Call closure twice', async () => {
    testClosure    = testFn( testArgs );
    actualResult   = await testClosure();
    sinon.assert.calledWithExactly.apply( null, getPoolConfigExpectedArgs );
    getPoolConfigStub.restore();
    getPoolConfigStub = sandbox.stub( testStubs, 'getPoolConfig' ).callsFake( () => {} );
    actualResult      = await testClosure();
    sinon.assert.notCalled( getPoolConfigStub );
    sinon.assert.notCalled( endStub );
    expect( actualResult ).to.equal( expectedResult );
  });

  it ('Terminate closure', async () => {
    testClosure    = testFn( testArgs );
    actualResult   = await testClosure();
    sinon.assert.calledWithExactly.apply( null, getPoolConfigExpectedArgs );
    sinon.assert.notCalled( endStub );
    expect( actualResult ).to.equal( expectedResult );
    expectedResult = null;
    actualResult   = await testClosure( true );
    sinon.assert.calledWithExactly.apply( null, endExpectedArgs );
    expect( actualResult ).to.equal( expectedResult );
  });

  it ('Terminate closure twice', async () => {
    testClosure    = testFn( testArgs );
    actualResult   = await testClosure();
    sinon.assert.calledWithExactly.apply( null, getPoolConfigExpectedArgs );
    sinon.assert.notCalled( endStub );
    expect( actualResult ).to.equal( expectedResult );
    expectedResult = null;
    actualResult   = await testClosure( true );
    sinon.assert.calledWithExactly.apply( null, endExpectedArgs );
    expect( actualResult ).to.equal( expectedResult );
    endStub.restore();
    endStub         = sandbox.stub( testPool, 'end' ).callsFake( () => {} ) ;
    endExpectedArgs = [ endStub ];
    expectedResult = null;
    actualResult   = await testClosure( true );
    sinon.assert.notCalled( endStub );
    expect( actualResult ).to.equal( expectedResult );
  });
});

describe(MODULE_NAME + ':connect', () => {
  let testModule;
  let actualResult;
  let expectedResult;
  let testCustomPool;
  let testDefaultPool;
  let connectCustomStub;
  let connectCustomRet;
  let connectCustomExpectedArgs;
  let connectDefaultStub;
  let connectDefaultRet;
  let connectDefaultExpectedArgs;
  let queryStub;
  let queryExpectedArgsArr;
  let getPoolStub;
  let getPoolRet;

  beforeEach( () => {
    commonBeforeEach();
    process.env.PGDATABASE = 'pgdb';
    process.env.PGUSER     = 'pguser';
    process.env.PGPASSWORD = 'pgpassword';
    ( { testModule } = createTestModuleAndGetProps() );
    testStubs = getPrivateStubs( testModule, [ 'getPool' ] );
    getPoolStub = sandbox.stub( testStubs, 'getPool' ).callsFake( () => {
      return getPoolRet;
    } );
    testCustomPool = {
      connect: () => {},
    };
    testDefaultPool = {
      connect: () => {},
    };
    connectCustomStub = sandbox.stub( testCustomPool, 'connect' ).callsFake( () => {
      return connectCustomRet;
    } );
    connectCustomRet = {
      id:   'custom',
      query: () => {},
    };
    connectCustomExpectedArgs = [ connectCustomStub ];
    connectDefaultStub = sandbox.stub( testDefaultPool, 'connect' ).callsFake( () => {
      return connectDefaultRet;
    } );
    connectDefaultRet = {
      id:    'default',
      query: () => {},
    };
    connectDefaultExpectedArgs = [ connectDefaultStub ];
    queryStub = sandbox.stub( connectDefaultRet, 'query' ).callsFake( () => {} );
    queryExpectedArgsArr = [
      [ queryStub, 'begin'    ],
      [ queryStub, 'commit'   ],
      [ queryStub, 'rollback' ],
    ];
  });

  afterEach( () => {
    commonAfterEach();
    testModule = null;
  });

  it ('Connect with default pool', async () => {
    getPoolRet     = testDefaultPool;
    expectedResult = connectDefaultRet;
    actualResult   = await testModule.connect();
    sinon.assert.calledWithExactly.apply( null, connectDefaultExpectedArgs );
    sinon.assert.notCalled( connectCustomStub );
    expect( actualResult ).to.equal( expectedResult );
    expect( typeof actualResult.begin ).to.equal( 'function' );
    expect( typeof actualResult.commit ).to.equal( 'function' );
    expect( typeof actualResult.rollback ).to.equal( 'function' );
  });

  it ('Connect with custom pool', async () => {
    getPoolRet     = testCustomPool;
    expectedResult = connectCustomRet;
    actualResult   = await testModule.connect( testCustomPool );
    sinon.assert.calledWithExactly.apply( null, connectCustomExpectedArgs );
    sinon.assert.notCalled( connectDefaultStub );
    expect( actualResult ).to.equal( expectedResult );
    expect( typeof actualResult.begin ).to.equal( 'function' );
    expect( typeof actualResult.commit ).to.equal( 'function' );
    expect( typeof actualResult.rollback ).to.equal( 'function' );
  });

  it ('Client methods OK', async () => {
    getPoolRet   = testDefaultPool;
    actualResult = await testModule.connect();
    actualResult.begin();
    actualResult.commit();
    actualResult.rollback();
    sinon.assert.callCount( queryStub, 3 );
    sinon.assert.calledWithExactly.apply( null, queryExpectedArgsArr.shift() );
  } );
} );

describe(MODULE_NAME + ':end', () => {
  let testModule;
  let actualResult;
  let expectedResult;
  let testStubs;
  let getPoolStub;
  let getPoolRet;
  let getPoolExpectedArgs;

  beforeEach( () => {
    commonBeforeEach();
    testPool = {
      connect: () => {}, 
      end:     () => {},
    };
    ( { testModule } = createTestModuleAndGetProps() );
    testStubs        = getPrivateStubs( testModule, [ 'getPool' ] );
    getPoolStub = sandbox.stub( testStubs, 'getPool' ).callsFake( () => {
      return getPoolRet;
    } );
    getPoolRet = 'getPool ret';
    getPoolExpectedArgs = [ getPoolStub, true ];
  });

  afterEach( () => {
    commonAfterEach();
    testModule = null;
  });


  it ('OK', () => {
    expectedResult = getPoolRet;
    actualResult   = testModule.end();
    sinon.assert.calledWithExactly.apply( null, getPoolExpectedArgs );
    expect( actualResult ).to.equal( expectedResult );
  });
});

describe(MODULE_NAME + ':createCustomPool', () => {
  let testModule;
  let testStubs;
  let testArgs;
  let actualResult;
  let expectedResult;
  let getCreatePoolClosureStub;
  let getCreatePoolClosureExpectedArgs;
  let getCustomPoolStub;
  let getCustomPoolRetArr;
  let getCustomPoolExpectedArgsArr;

  beforeEach( () => {
    commonBeforeEach();
    ( { testModule } = createTestModuleAndGetProps() );
    testStubs = getPrivateStubs( testModule, [ 'getCreatePoolClosure' ] );
    testStubs.getCustomPool = () => {};
    testArgs  = 'test dbConfig';
    getCreatePoolClosureStub = sandbox.stub( testStubs, 'getCreatePoolClosure' ).callsFake( () => {
      return testStubs.getCustomPool;
    } );
    getCreatePoolClosureExpectedArgs = [ getCreatePoolClosureStub, testArgs ];
    getCustomPoolStub = sandbox.stub( testStubs, 'getCustomPool' ).callsFake( () => {
      return getCustomPoolRetArr.shift();
    } );
    getCustomPoolRetArr = [
      { p1: 'val1' },
      null,
    ];
    getCustomPoolExpectedArgsArr = [
      [ getCustomPoolStub ],
      [ getCustomPoolStub, true ],
    ];
  });

  afterEach( () => {
    commonAfterEach();
    testModule = null;
  });

  it ('OK', async () => {
    expectedResult = getCustomPoolRetArr[ 0 ];
    actualResult   = await testModule.createCustomPool( testArgs );
    sinon.assert.callCount( getCustomPoolStub, 1 );
    sinon.assert.calledWithExactly.apply( null, getCreatePoolClosureExpectedArgs );
    sinon.assert.calledWithExactly.apply( null, getCustomPoolExpectedArgsArr.shift() );
    expect( actualResult ).to.equal( expectedResult );
  });

  it ('Close the pool', async () => {
    actualResult = await testModule.createCustomPool( testArgs );
    actualResult.close();
    sinon.assert.callCount( getCustomPoolStub, 2 );
    sinon.assert.calledWithExactly.apply( null, getCustomPoolExpectedArgsArr.shift() );
    sinon.assert.calledWithExactly.apply( null, getCustomPoolExpectedArgsArr.shift() );
  });
});
