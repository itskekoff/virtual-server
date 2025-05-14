const { Vec3 } = require("vec3");

// mineflayer-alpha

const BlockFace = {
    UNKNOWN: -999,
    BOTTOM: 0,
    TOP: 1,
    NORTH: 2,
    SOUTH: 3,
    WEST: 4,
    EAST: 5,
};

class RaycastIterator {
    constructor(pos, dir, maxDistance) {
        this.pos = pos;
        this.dir = dir.normalize();
        this.maxDistance = maxDistance;

        this.block = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z), face: BlockFace.UNKNOWN };
        this.stepX = Math.sign(this.dir.x);
        this.stepY = Math.sign(this.dir.y);
        this.stepZ = Math.sign(this.dir.z);

        this.invDirX = this.dir.x === 0 ? Number.MAX_VALUE : 1 / this.dir.x;
        this.invDirY = this.dir.y === 0 ? Number.MAX_VALUE : 1 / this.dir.y;
        this.invDirZ = this.dir.z === 0 ? Number.MAX_VALUE : 1 / this.dir.z;

        this.tMaxX = this.dir.x === 0 ? Number.MAX_VALUE : Math.abs((this.block.x + (this.dir.x > 0 ? 1 : 0) - pos.x) / this.dir.x);
        this.tMaxY = this.dir.y === 0 ? Number.MAX_VALUE : Math.abs((this.block.y + (this.dir.y > 0 ? 1 : 0) - pos.y) / this.dir.y);
        this.tMaxZ = this.dir.z === 0 ? Number.MAX_VALUE : Math.abs((this.block.z + (this.dir.z > 0 ? 1 : 0) - pos.z) / this.dir.z);

        this.tDeltaX = this.dir.x === 0 ? Number.MAX_VALUE : Math.abs(1 / this.dir.x);
        this.tDeltaY = this.dir.y === 0 ? Number.MAX_VALUE : Math.abs(1 / this.dir.y);
        this.tDeltaZ = this.dir.z === 0 ? Number.MAX_VALUE : Math.abs(1 / this.dir.z);
    }

    intersect(shapes, offset) {
        let closestIntersection = null;
        let closestFace = BlockFace.UNKNOWN;
        let minT = Number.MAX_VALUE;

        for (const shape of shapes) {
            let tmin = (shape[this.invDirX > 0 ? 0 : 3] - this.pos.x + offset.x) * this.invDirX;
            let tmax = (shape[this.invDirX > 0 ? 3 : 0] - this.pos.x + offset.x) * this.invDirX;
            const tymin = (shape[this.invDirY > 0 ? 1 : 4] - this.pos.y + offset.y) * this.invDirY;
            const tymax = (shape[this.invDirY > 0 ? 4 : 1] - this.pos.y + offset.y) * this.invDirY;

            let face = this.stepX > 0 ? BlockFace.WEST : BlockFace.EAST;

            if (tmin > tymax || tymin > tmax) continue;
            if (tymin > tmin) {
                tmin = tymin;
                face = this.stepY > 0 ? BlockFace.BOTTOM : BlockFace.TOP;
            }
            if (tymax < tmax) tmax = tymax;

            const tzmin = (shape[this.invDirZ > 0 ? 2 : 5] - this.pos.z + offset.z) * this.invDirZ;
            const tzmax = (shape[this.invDirZ > 0 ? 5 : 2] - this.pos.z + offset.z) * this.invDirZ;

            if (tmin > tzmax || tzmin > tmax) continue;
            if (tzmin > tmin) {
                tmin = tzmin;
                face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
            if (tzmax < tmax) tmax = tzmax;

            if (tmin < minT) {
                minT = tmin;
                closestFace = face;
                closestIntersection = this.pos.plus(this.dir.scaled(tmin));
            }
        }

        if (closestIntersection && minT <= this.maxDistance) {
            return { pos: closestIntersection, face: closestFace };
        }
        return null;
    }

    next() {
        if (Math.min(this.tMaxX, this.tMaxY, this.tMaxZ) > this.maxDistance) return null;

        if (this.tMaxX < this.tMaxY) {
            if (this.tMaxX < this.tMaxZ) {
                this.block.x += this.stepX;
                this.tMaxX += this.tDeltaX;
                this.block.face = this.stepX > 0 ? BlockFace.WEST : BlockFace.EAST;
            } else {
                this.block.z += this.stepZ;
                this.tMaxZ += this.tDeltaZ;
                this.block.face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
        } else {
            if (this.tMaxY < this.tMaxZ) {
                this.block.y += this.stepY;
                this.tMaxY += this.tDeltaY;
                this.block.face = this.stepY > 0 ? BlockFace.BOTTOM : BlockFace.TOP;
            } else {
                this.block.z += this.stepZ;
                this.tMaxZ += this.tDeltaZ;
                this.block.face = this.stepZ > 0 ? BlockFace.NORTH : BlockFace.SOUTH;
            }
        }

        return this.block;
    }

    [Symbol.iterator]() {
        return {
            next: () => ({
                value: this.next(),
                done: Math.min(this.tMaxX, this.tMaxY, this.tMaxZ) > this.maxDistance,
            }),
        };
    }
}

module.exports = { RaycastIterator, BlockFace };
