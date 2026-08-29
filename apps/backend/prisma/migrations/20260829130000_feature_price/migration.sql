CREATE TABLE "FeaturePrice" (
    "key" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "FeaturePrice_pkey" PRIMARY KEY ("key")
);
