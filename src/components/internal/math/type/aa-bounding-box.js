const {Vec3} = require("vec3");

const Direction = {
    WEST: 0,
    EAST: 1,
    DOWN: 2,
    UP: 3,
    NORTH: 4,
    SOUTH: 5
};

class BoundingBox {
    constructor(minX, minY, minZ, maxX, maxY, maxZ) {
        this.minX = minX;
        this.minY = minY;
        this.minZ = minZ;
        this.maxX = maxX;
        this.maxY = maxY;
        this.maxZ = maxZ;
    }

    contains(aabb) {
        return this.containsCoords(aabb.minX, aabb.minY, aabb.minZ) && this.containsCoords(aabb.maxX, aabb.maxY, aabb.maxZ);
    }

    containsCoords(x, y, z) {
        return this.minX <= x && this.maxX >= x && this.minY <= y && this.maxY >= y && this.minZ <= z && this.maxZ >= z;
    }


    expand(vec) {
        const {x, y, z} = vec;

        this.minX += (x < 0) ? x : 0;
        this.maxX += (x > 0) ? x : 0;

        this.minY += (y < 0) ? y : 0;
        this.maxY += (y > 0) ? y : 0;

        this.minZ += (z < 0) ? z : 0;
        this.maxZ += (z > 0) ? z : 0;

        return this;
    }

    inflate(x, y, z) {
        return new BoundingBox(
            this.minX - x,
            this.minY - y,
            this.maxX + x,
            this.maxY + y,
            this.minZ - z,
            this.maxZ + z
        );
    }


    static createBoundingBox(x, y, z, width = 0.6, height = 1.8) {
        const halfWidth = width / 2;
        return new BoundingBox(
            x - halfWidth,
            y,
            z - halfWidth,
            x + halfWidth,
            y + height,
            z + halfWidth
        );
    }
}

module.exports = {BoundingBox};
