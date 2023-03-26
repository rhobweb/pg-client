
import { expectType } from 'tsd';
import pg_client, { TypePool, TypeEnvVarStoredConfig, TypePoolClient, TypeCustomPool, TypeEnvVarConfig } from '../../pg-client';

expectType<TypeEnvVarStoredConfig>( pg_client.getConfig() );
expectType<TypeEnvVarStoredConfig>( pg_client.getConfig( { returnSensitive: true } ) );
expectType<TypeEnvVarStoredConfig>( pg_client.getConfig( { dbConfig: { prop: 'value' } } ) );
expectType<TypeEnvVarStoredConfig>( pg_client.getConfig( { returnSensitive: false, dbConfig: { prop: 'value' } } ) );

expectType<Promise<TypePoolClient>>( pg_client.connect() );
expectType<Promise<TypePoolClient>>( pg_client.connect( null ) );
expectType<Promise<TypePoolClient>>( pg_client.connect( {} as TypePool ) );

expectType<Promise<null>>( pg_client.end() );

expectType<Promise<TypeCustomPool>>( pg_client.createCustomPool( {} as TypeEnvVarConfig ) );
