const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, 'app/modules');

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

const templates = moduleName => {
  const Capitalized = capitalize(moduleName);

  return {
    controller: `
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pickValidFields';
import { ${moduleName}Service } from './${moduleName}.service';

// create ${Capitalized}
const create${Capitalized} = catchAsync(async (req: Request, res: Response) => {

  const result = await ${moduleName}Service.create${Capitalized}(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: '${Capitalized} created successfully',
    data: result,
  });
});

// get all ${Capitalized}
const ${moduleName}FilterableFields = [
  'searchTerm',
  'id',
  'createdAt',
]
const get${Capitalized}List = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const filters = pick(req.query, ${moduleName}FilterableFields);
  const result = await ${moduleName}Service.get${Capitalized}ListIntoDb( options, filters);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} list retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

// get ${Capitalized} by id
const get${Capitalized}ById = catchAsync(async (req: Request, res: Response) => {
  const {id} = req.params;
  const result = await ${moduleName}Service.get${Capitalized}ById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} details retrieved successfully',
    data: result,
  });
});

// update ${Capitalized}
const update${Capitalized} = catchAsync(async (req: Request, res: Response) => {
  const {id} = req.params;
  const data = req.body;
  const result = await ${moduleName}Service.update${Capitalized}IntoDb(id, data);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} updated successfully',
    data: result,
  });
});

// delete ${Capitalized}
const delete${Capitalized} = catchAsync(async (req: Request, res: Response) => {
  const {id} = req.params;
  const result = await ${moduleName}Service.delete${Capitalized}IntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: '${Capitalized} deleted successfully',
    data: result,
  });
});

export const ${moduleName}Controller = {
  create${Capitalized},
  get${Capitalized}List,
  get${Capitalized}ById,
  update${Capitalized},
  delete${Capitalized},
};
`,

    service: `
import { IPaginationOptions } from "../../interface/pagination.type";
import { prisma } from "../../utils/prisma";
import ApiError from '../../errors/AppError';
import httpStatus from 'http-status';
import { paginationHelper } from "../../utils/calculatePagination";
import { Prisma } from "@prisma/client";
import { Request } from 'express';

// create ${Capitalized}
const create${Capitalized} = async (req:Request) => {
  const data = req.body
  const result = await prisma.${moduleName}.create({ data });
  return result;
};

// get all ${Capitalized}
type I${Capitalized}FilterRequest = {
  searchTerm?: string;
  id?: string;
  createdAt?: string;
}
const ${moduleName}SearchAbleFields = ['fullName', 'email'];

const get${Capitalized}ListIntoDb = async (options: IPaginationOptions, filters: I${Capitalized}FilterRequest) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.${moduleName}WhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
      ...${moduleName}SearchAbleFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    ],
    });
  }

  if (Object.keys(filterData).length) {
    Object.keys(filterData).forEach((key) => {
      const value = (filterData as any)[key];
      if (value === "" || value === null || value === undefined) return;
      if (key === "createdAt" && value) {
        const start = new Date(value);
        start.setHours(0, 0, 0, 0);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        andConditions.push({
          createdAt: {
            gte: start.toISOString(),
            lte: end.toISOString(),
          },
        });
        return;
      }
      if (key.includes(".")) {
        const [relation, field] = key.split(".");
        andConditions.push({
          [relation]: {
            some: { [field]: value },
          },
        });
        return;
      }
      if (key === "status") {
        const statuses = Array.isArray(value) ? value : [value];
        andConditions.push({
          status: { in: statuses },
        });
        return;
      }
      andConditions.push({
        [key]: value,
      });
    });
  }

  const whereConditions: Prisma.${moduleName}WhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.${moduleName}.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy: {
      createdAt: "desc",
    }
  });

  const total = await prisma.${moduleName}.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get ${Capitalized} by id
const get${Capitalized}ById = async (id: string) => {
  const result = await prisma.${moduleName}.findUnique({
   where: { id }
   });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, '${Capitalized} not found');
  }
  return result;
};

// update ${Capitalized}
const update${Capitalized}IntoDb = async (id: string, data: any) => {
  const result = await prisma.${moduleName}.update({
  where: { id }, data });
  return result;
};

// delete ${Capitalized}
const delete${Capitalized}IntoDb = async (id: string) => {
  const result = await prisma.${moduleName}.delete({
   where: { id }
   });
  return result;
};

export const ${moduleName}Service = {
  create${Capitalized},
  get${Capitalized}ListIntoDb,
  get${Capitalized}ById,
  update${Capitalized}IntoDb,
  delete${Capitalized}IntoDb,
};
`,

    routes: `
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ${moduleName}Controller } from './${moduleName}.controller';
import { ${moduleName}Validation } from './${moduleName}.validation';

const router = express.Router();

router.post('/', auth(), ${moduleName}Controller.create${Capitalized});

router.get('/', auth(), ${moduleName}Controller.get${Capitalized}List);

router.get('/:id', auth(), ${moduleName}Controller.get${Capitalized}ById);

router.put('/:id', auth(), ${moduleName}Controller.update${Capitalized});

router.delete('/:id', auth(), ${moduleName}Controller.delete${Capitalized});

export const ${moduleName}Routes = router;
`,

    validation: `
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export const ${moduleName}Validation = {
  createSchema,
  updateSchema,
};
`,
  };
};

const generateModule = moduleName => {
  if (!moduleName) {
    console.error('❌ Please provide a module name!');
    process.exit(1);
  }

  const modulePath = path.join(MODULES_DIR, moduleName);
  if (fs.existsSync(modulePath)) {
    console.error(`❌ Module '${moduleName}' already exists!`);
    process.exit(1);
  }

  fs.mkdirSync(modulePath, { recursive: true });

  // Generate files from templates
  Object.entries(templates(moduleName)).forEach(([key, content]) => {
    const filePath = path.join(modulePath, `${moduleName}.${key}.ts`);
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Created: ${filePath}`);
  });

  console.log(`🎉 Module '${moduleName}' created successfully!`);
};

// Run script
const [, , moduleName] = process.argv;
generateModule(moduleName);
