import fs from "fs";
import path from "path";

type Data = Record<string, any>;

export class Database {
	public data: Data = {};
	public id: string;
	public shards: number;

	constructor(clientId: string, shards: number) {
		this.fetch();
		this.id = clientId;
		this.shards = shards;
	}

	set<T>(key: string, value: T): void {
		if (!key) throw new Error('"key" is empty');

		const keys: string[] = key.split(".");
		if (keys.length === 0) return;

		this.updateData(this.data, keys, value);
		this.save();
	}

	get<T>(key: string): T | undefined {
		if (!key) throw new Error('"key" is empty');
		if (Object.keys(this.data).length === 0) this.fetch();

		return key.split(".").reduce((acc, curr) => acc?.[curr], this.data) ?? null;
	}

	push<T>(key: string, value: T): void {
		if (!key) throw new Error('"key" is empty');

		const oldArray = this.get<T[]>(key) || [];
		if (!Array.isArray(oldArray)) throw new Error("Key does not point to an array");

		oldArray.push(value);
		this.set(key, oldArray);
	}

	delete(key: string): boolean {
		if (!key) throw new Error('"key" is empty');

		const keys: string[] = key.split(".");
		if (keys.length === 0) return false;

		const lastKey: string = keys.pop() || "";
		let currentObj: Data = this.data;

		keys.map((k) => {
			if (typeof currentObj[k] === "object") currentObj = currentObj[k];
			else throw new Error(`Key path "${key}" does not exist`);
		});

		if (currentObj && lastKey in currentObj) {
			delete currentObj[lastKey];
			this.save();
			return true;
		}

		return false;
	}

	private updateData(data: Data, keys: string[], value: any): void {
		let currentObj: Data = data;

		keys.forEach((key, index) => {
			if (index === keys.length - 1) currentObj[key] = value;
			else {
				if (typeof currentObj[key] !== "object") currentObj[key] = {};

				currentObj = currentObj[key];
			}
		});
	}

	private getFilePath() {
		return path.join(__dirname, "../datastore", `database-${this.shards}-${this.id}.json`);
	}

	fetch() {
		try {
			const directory = path.join(__dirname, "../datastore");
			if (!fs.existsSync(directory)) {
				fs.mkdirSync(directory, { recursive: true });
			}

			const filePath = this.getFilePath();

			const rawData = fs.readFileSync(filePath, "utf-8");
			this.data = JSON.parse(rawData) || {};
		} catch (err) {
			if (err.code === "ENOENT") {
				this.data = {};
			} else {
				throw new Error("Failed to fetch data");
			}
		}
	}

	private save() {
		try {
			const filePath = this.getFilePath();
			fs.writeFileSync(filePath, JSON.stringify(this.data));
		} catch (error) {
			throw new Error("Failed to save data");
		}
	}
}
