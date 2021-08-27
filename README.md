_Masters Thesis in Informatics_

# Trusted Data Aggregation in Distributed Ledger Technology

## Setup

### **Prerequisites**

- NodeJS
- Docker

---

### **Ganache Docker**

**1.** Download image

```
# docker pull trufflesuite/ganache-cli
```

**2.** Run image with mnemonic

```
# docker run --detach --publish 8545:8545 trufflesuite ganache-cli:latest -l 10000000 --quiet --accounts 20 --networkId 5711 --db /home/db --acctKeys /home/accounts --mnemonic "<your mnemonic phrase>"
```

example mnemonic: `"mimic dune forward party defy island absorb insane deputy obvious brother immense"`

**3.** Copy accounts from docker container to `data` folder

```
# docker cp <container hash>:/home/accounts data/ && mv data/accounts data/accounts.json
```

Ganache will be available under `ws://0.0.0.0:8545`

---

### **MongoDB Docker**

**1.** Download image

```
# docker pull mongo:4.0-xenial
```

**2.** Run docker container with mongodb replica

```
# docker run --name mongo -d mongo:4.0-xenial --replSet rs0
```

**3.** Log into docker container

```
# docker exec -it <container hash> bash
```

**4.** Open mongo shell in container

```
# mongo
```

**5.** Initialize replica

```
> rs.initiate()
```

**6.** Exit mongo shell. Get the IP address of the docker container

```
# docker inspect <container hash> | grep IPAddress
```

**7.** Open `servers/demo/env.js` and update variable `dbUri` with the IPAddress

---

### **Running the Project** (locally)

**1.** Install packages. Run `install.sh` script in root folder

```
# ./install.sh
```

**2.** Compile and deploy smart contracts in `/dlt` folder

```
# truffle migrate
```

**3.** Start Servers in `/servers` folder

```
# npm start
```

**4.** Start Front-ends in `/front-ends` folder

```
# npm start
```

**5.** Run `init.sh` script

```
# node servers/demo/init.js
```
