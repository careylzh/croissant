pkill -f "npm start"
npm run build
npm start &
sleep 5
node scan.js