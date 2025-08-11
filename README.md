Croissant is an open-source software tool which allows software engineers to perform in-person code reviews, faster, better and more intuitively. 

```
#Install SonarQube, a package for security reporting (MacOS only)
### Download
cd ~/Downloads
curl -O https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-9.9.1.69595.zip
### Extract
unzip sonarqube-9.9.1.69595.zip
### Install
sudo mv sonarqube-9.9.1.69595 /opt/sonarqube
sudo chown -R $(whoami) /opt/sonarqube
### Install and use Java 17
sdk install java 17.0.9-tem
sdk use java 17.0.9-tem
### Start
cd /opt/sonarqube
./bin/macosx-universal-64/sonar.sh start

#install nodeJS dependencies and run
npm i
npm run build
npm run build css 
npm start
```