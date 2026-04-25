# 🧱 AI Interviewer VM Migration Guide (Clean Version)

This assumes:

* Ubuntu VM
* 64GB data disk attached
* Docker-based stack
* Postgres 17
* Redis
* Qdrant
* Tailscale
* UFW firewall

---

# 0️⃣ Pre-Migration Checklist (Before Touching New VM)

From old machine:

```bash
pg_dump -Fc -U postgres interviewer -f interviewer.dump
```

Also export roles (IMPORTANT):

```bash
pg_dumpall --globals-only -U postgres > globals.sql
```

Download both locally.

---

# 1️⃣ Attach and Mount Data Disk

### Identify disk

```bash
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT
```

Assume `/dev/sdb`.

### Format (ONLY if new)

```bash
sudo mkfs.ext4 /dev/sdb
```

### Create mount

```bash
sudo mkdir /data
sudo mount /dev/sdb /data
```

Verify:

```bash
df -h
```

### Persist mount

```bash
sudo blkid /dev/sdb
```

Copy UUID → edit:

```bash
sudo nano /etc/fstab
```

Add:

```
UUID=xxxx-xxxx  /data  ext4  defaults,nofail  0  2
```

Test:

```bash
sudo umount /data
sudo mount -a
```

---

# 2️⃣ Prepare Data Directories

```bash
sudo mkdir -p /data/postgres
sudo mkdir -p /data/qdrant
sudo mkdir -p /data/redis
sudo mkdir -p /data/hf_cache

sudo chown -R 999:999 /data/postgres
sudo chown -R 1000:1000 /data/qdrant
sudo chown -R 999:999 /data/redis
sudo chown -R 1000:1000 /data/hf_cache

```

---

# 3️⃣ Install Docker Properly

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Logout & SSH again.

---

# 4️⃣ Create Project Structure

```bash
mkdir ~/infra
cd ~/infra
```

Create `.env`

```env
POSTGRES_DB=interviewer
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strongpass

REDIS_PASSWORD=strongredis
REDIS_MAXMEMORY=1gb
```

---

# 5️⃣ Clean docker-compose.yml (Stable Version)

```yaml
version: "3.9"

services:

  postgres:
    image: postgres:17
    container_name: postgres
    restart: always
    env_file:
      - .env
    volumes:
      - /data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    container_name: redis
    restart: always
    volumes:
      - /data/redis:/data
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --appendonly yes
      --maxmemory ${REDIS_MAXMEMORY}
      --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    restart: always
    volumes:
      - /data/qdrant:/qdrant/storage
    ports:
      - "6333:6333"
```

---

# 6️⃣ Start Services

```bash
docker compose up -d
```

Verify:

```bash
docker ps
```

---

# 7️⃣ Restore Roles FIRST

Copy files:

```bash
docker cp globals.sql postgres:/globals.sql
docker exec -it postgres psql -U postgres -f /globals.sql
```

---

# 8️⃣ Restore Database

```bash
docker cp interviewer.dump postgres:/interviewer.dump
docker exec -it postgres pg_restore -U postgres -d interviewer /interviewer.dump
```

Verify:

```bash
docker exec -it postgres psql -U postgres -d interviewer -c "\dt"
```

---

# 9️⃣ Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale ip -4
```

---

# 🔟 Setup Firewall

```bash
sudo apt install ufw -y
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443

sudo ufw allow from 100.0.0.0/8 to any port 5432
sudo ufw allow from 100.0.0.0/8 to any port 6379
sudo ufw allow from 100.0.0.0/8 to any port 6333
sudo ufw allow from 100.0.0.0/8 to any port 8080

sudo ufw deny 5432
sudo ufw deny 6379
sudo ufw deny 6333
sudo ufw deny 8080

sudo ufw enable
```

Verify order:

```bash
sudo ufw status numbered
```

Allow rules must appear above deny rules.

---

# 11️⃣ Configure Postgres for Tailscale

Edit:

```bash
sudo nano /data/postgres/pg_hba.conf
```

Add:

```
host    all     all     100.0.0.0/8     md5
```

Reload:

```bash
docker restart postgres
```

Verify:

```bash
docker exec -it postgres psql -U postgres -c "SELECT * FROM pg_hba_file_rules;"
```

---

# 12️⃣ Final Validation

From laptop (via Tailscale):

```bash
psql -h 100.x.x.x -U jithsungh -d interviewer
redis-cli -h 100.x.x.x -a strongredis ping
curl http://100.x.x.x:6333/collections
```

---

# 🧠 What You Learned Today

You dealt with:

* Data disk mounting
* Bind mounts
* Major Postgres version mismatch
* Role restoration
* Docker restart loops
* Firewall rule ordering
* Network exposure verification

That’s real infra experience.

---
