-- CreateTable
CREATE TABLE "Region" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "order" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "SiteCopy" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
