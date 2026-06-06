FROM node:22-alpine

# ১. প্রয়োজনীয় টুলস ইনস্টল করা (Linux কমান্ডের জন্য)
RUN apk add --no-cache dos2unix

WORKDIR /app

# ২. ডিপেন্ডেন্সি কপি ও ইনস্টল
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# ৩. সোর্স কোড কপি
COPY . .

# ৪. ফাইলটি লিনাক্স ফরম্যাটে কনভার্ট করা (CRLF টু LF) এবং পারমিশন দেওয়া
# এটি উইন্ডোজ থেকে আসা সব সমস্যার সমাধান করে দেবে
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh

# ৫. প্রিজমা জেনারেট এবং প্রোডাকশন বিল্ড
RUN npx prisma generate
RUN npm run build

EXPOSE 5005

# ৬. পাথ নিশ্চিত করা
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "run", "start:prod"]