const { Client } = require('pg');

const client = new Client({
    // Connecting to the default 'postgres' db to be able to create our new db
    connectionString: 'postgres://postgres:admin@localhost:5432/postgres'
});

async function run() {
    try {
        await client.connect();
        const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'padex'");

        if (res.rowCount === 0) {
            console.log('[init-db] Creando base de datos padex...');
            await client.query('CREATE DATABASE padex');
            console.log('[init-db] ✅ Base de datos padex creada exitosamente.');
        } else {
            console.log('[init-db] ✅ La base de datos "padex" ya existe.');
        }
    } catch (error) {
        console.error('[init-db] ❌ Error conectando a PostgreSQL:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
