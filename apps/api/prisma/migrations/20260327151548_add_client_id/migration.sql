/*
  Warnings:

  - A unique constraint covering the columns `[clientId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "clientId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Game_clientId_key" ON "Game"("clientId");
