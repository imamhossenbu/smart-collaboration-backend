FROM node:22-alpine

WORKDIR /app

# Install dependencies first (leverage docker cache)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and entrypoint
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

RUN npm run build

EXPOSE 5005

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "start:prod"]