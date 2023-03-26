import pg from 'pg';

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

type TypeGetConfigProps = { returnSensitive?: boolean, dbConfig?: TypeEnvVarConfig };

export function getConfig( props? : TypeGetConfigProps ) : TypeEnvVarStoredConfig;

export function connect( pool? : TypeNullablePool ) : Promise<TypePoolClient>;

export function end() : Promise<null>;

export function createCustomPool( dbConfig : TypeEnvVarConfig ) : Promise<TypeCustomPool>;
