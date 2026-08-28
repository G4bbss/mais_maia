// Importar o mysql2 no padrão ES Modules
import mysql from 'mysql2/promise';

// Configurar a conexão com o banco de dados
const conexaoBanco = mysql.createPool({
    host: '10.87.100.6', // Servidor mysql da escola
    user: 'aluno',
    password: 'Senai1234',
    database: 'maiageminix',
    waitForConnections: true // Aguarda a confirmação
});

// Exportar como padrão (default) para funcionar com "import conexao from ..."
export default conexaoBanco;