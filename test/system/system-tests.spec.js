/**
 * DESCRIPTION:
 * Unit Tests for pg-client package.
 */

'use strict';
const sinon  = require( 'sinon' );
const expect = require( 'chai' ).expect;

const REL_SRC_PATH = '../../';
const MODULE_NAME  = 'pg-client';
const TEST_MODULE  = REL_SRC_PATH + MODULE_NAME;

// Default DB connection values used if the environment variables are not defined
const DEFAULT_PGDATABASE         = 'rokit_active_lcl';
const DEFAULT_PGUSER             = 'rokit_active_api';
const DEFAULT_PGPASSWORD         = 'DsgF!w7YGsu3';
const DEFAULT_PG_MAX_CLIENT      = '1';
const DEFAULT_PG_IDLE_TIMEOUT_MS = '1000';
const DEFAULT_PG_CNXN_TIMEOUT_MS = '1000';

var sandbox;

/**
 * Modules load other modules, so to force a module reload need to delete
 * the test module and all child modules from the require cache.
 */
function unrequireModules() {
  var arrKey = [ require.resolve(TEST_MODULE)
               ];
  for (var i in arrKey) {
    var key = arrKey[i];
    delete require.cache[key];
  }
}

function commonBeforeEach() {
  unrequireModules();
  sandbox = sinon.createSandbox();
}

function commonAfterEach() {
  sandbox.restore();
  unrequireModules();
}

function createTestModule() {
  const testModule = require( TEST_MODULE );
  return testModule;
}

describe(MODULE_NAME + ':connect', () => {
  var testModule;
  var actualErr;
  var testClient1;
  var testClient2;
  var testCustomPool;
  var expectedErrMessage;
  var arrEnvVarCreated;

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

  function defineEnvVars( arrVar ) {
    arrVar.forEach( envVar => { 
      switch ( envVar ) {
        case 'PGDATABASE':         stubEnvVar( 'PGDATABASE',         DEFAULT_PGDATABASE         ); break;
        case 'PGUSER':             stubEnvVar( 'PGUSER',             DEFAULT_PGUSER             ); break;
        case 'PGPASSWORD':         stubEnvVar( 'PGPASSWORD',         DEFAULT_PGPASSWORD         ); break;
        case 'PG_MAX_CLIENT':      stubEnvVar( 'PG_MAX_CLIENT',      DEFAULT_PG_MAX_CLIENT      ); break;
        case 'PG_IDLE_TIMEOUT_MS': stubEnvVar( 'PG_IDLE_TIMEOUT_MS', DEFAULT_PG_IDLE_TIMEOUT_MS ); break;
        case 'PG_CNXN_TIMEOUT_MS': stubEnvVar( 'PG_CNXN_TIMEOUT_MS', DEFAULT_PG_CNXN_TIMEOUT_MS ); break;
      }
    } );
  }

  beforeEach( () => {
    commonBeforeEach();
    testModule       = createTestModule();
    arrEnvVarCreated = [];
    testClient1      = null;
    testClient2      = null;
    testCustomPool   = null;
  });

  afterEach( () => {
    commonAfterEach();
    deleteCreatedEnvVars();
    testModule = null;
  });

  it ('PGDATABASE not defined', async () => {
    expectedErrMessage = 'Environment variable not defined: PGDATABASE';
    try {
      await testModule.connect();
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('PGUSER not defined', async () => {
    defineEnvVars( [ 'PGDATABASE' ] );
    expectedErrMessage = 'Environment variable not defined: PGUSER';
    try {
      await testModule.connect();
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('PGPASSWORD not defined', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER' ] );
    expectedErrMessage = 'Environment variable not defined: PGPASSWORD';
    try {
      await testModule.connect();
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( actualErr.message ).to.equal( expectedErrMessage );
  });

  it ('All mandatory variables defined', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER', 'PGPASSWORD' ] );
    try {
      testClient1 = await testModule.connect();
    }
    catch ( err ) {
      sinon.assert.fail(`Test should not fail: ${err.message}`);
    }
    expect( testClient1._connected ).to.be.true;
    await testClient1.release();
    await testModule.end();
  });

  it ('All optional variables defined', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PG_MAX_CLIENT', 'PG_IDLE_TIMEOUT_MS', 'PG_CNXN_TIMEOUT_MS' ] );
    try {
      testClient1 = await testModule.connect();
      await testClient1.begin();
      const result = await testClient1.query( 'SELECT 1' );
      expect( result.rowCount ).to.equal( 1 );
      await testClient1.rollback();
    }
    catch ( err ) {
      sinon.assert.fail(`Test should not fail: ${err.message}`);
    }
    expect( testClient1._connected ).to.be.true;
    await testClient1.release();
    await testModule.end();
  });

  it ('Connect two clients', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER', 'PGPASSWORD' ] );
    try {
      testClient1 = await testModule.connect();
      testClient2 = await testModule.connect();
    }
    catch ( err ) {
      sinon.assert.fail(`Test should not fail: ${err.message}`);
    }
      expect( testClient1._connected ).to.be.true;
      expect( testClient2._connected ).to.be.true;
      await testClient1.release();
      await testClient2.release();
      await testModule.end();
    });

  it ('Attempt to connect too many clients, connection timeout set', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PG_MAX_CLIENT', 'PG_IDLE_TIMEOUT_MS', 'PG_CNXN_TIMEOUT_MS' ] );
    try {
      testClient1 = await testModule.connect();
      await testModule.connect();
      sinon.assert.fail(`Test should not succeed`);
    }
    catch ( err ) {
      actualErr = err;
    }
    expect( testClient1._connected ).to.be.true;
    await testClient1.release();
    expect( actualErr.message ).to.equal( 'timeout exceeded when trying to connect' );
    await testModule.end();
  });

  it ('Attempt to connect too many clients, no connection timeout set', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PG_MAX_CLIENT', 'PG_IDLE_TIMEOUT_MS' ] );
    try {
      testClient1 = await testModule.connect();
      setTimeout( async () => {
        await testClient1.release();
        testClient1 = null;
      }, 2000);
      testClient2 = await testModule.connect();
    }
    catch ( err ) {
      sinon.assert.fail(`Test should not fail: ${err.message}`);
    }
    expect( testClient1 ).to.be.null;
    expect( testClient2._connected ).to.be.true;
    await testClient2.release();
    await testModule.end();
  });

  it ('Connect with regular pool and custom pool', async () => {
    defineEnvVars( [ 'PGDATABASE', 'PGUSER', 'PGPASSWORD' ] );
    try {
      testClient1    = await testModule.connect();
      testCustomPool = await testModule.createCustomPool();
      testClient2    = await testModule.connect( testCustomPool );
    }
    catch ( err ) {
      sinon.assert.fail(`Test should not fail: ${err.message}`);
    }
    expect( testClient1._connected ).to.be.true;
    expect( testClient2._connected ).to.be.true;
    await testClient1.release();
    await testClient2.release();
    await testCustomPool.close();
    await testModule.end();
  });
});
