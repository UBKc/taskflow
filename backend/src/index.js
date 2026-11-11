import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`TaskFlow backend ${PORT} portunda çalışıyor -> http://localhost:${PORT}`);
});
