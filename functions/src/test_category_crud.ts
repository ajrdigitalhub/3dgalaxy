import prisma from './config/database';
import {
  getCategories,
  getCategoriesTree,
  getCategoryBySlug,
  getBreadcrumbsBySlug,
  getBreadcrumbs,
  getDirectChildren,
  createCategory,
  updateCategory,
  deleteCategory,
  clearCategoryCache
} from './controllers/category';
import { Request, Response } from 'express';

// Helper mock for Express Request & Response
function mockReqRes(params: any = {}, body: any = {}, query: any = {}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    params,
    body,
    query
  };

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    }
  };

  return {
    req: req as Request,
    res: res as Response,
    getStatus: () => statusCode,
    getData: () => responseData
  };
}

async function runCategoryTestSuite() {
  console.log('🚀 STARTING COMPREHENSIVE CATEGORY CRUD TEST SUITE 🚀\n');
  let passedCount = 0;
  let totalCount = 0;

  const assert = (condition: boolean, testName: string, extraInfo: string = '') => {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✅ [PASS] Test ${totalCount}: ${testName}`);
    } else {
      console.error(`❌ [FAIL] Test ${totalCount}: ${testName} ${extraInfo ? '-> ' + extraInfo : ''}`);
    }
  };

  const testCategoryName = `Automated Test Category ${Date.now()}`;
  const testCategorySlug = `auto-test-cat-${Date.now()}`;
  let createdCategoryId: string = '';

  try {
    // ----------------------------------------------------
    // Scenario 1: CREATE Category via Controller
    // ----------------------------------------------------
    const createReqRes = mockReqRes({}, {
      name: testCategoryName,
      slug: testCategorySlug,
      description: 'Test category description for automated testing',
      isFeatured: true,
      isActive: true,
      shippingCharge: 150
    });

    await createCategory(createReqRes.req, createReqRes.res);
    const createStatus = createReqRes.getStatus();
    const createData = createReqRes.getData();

    assert(createStatus === 201 && createData && createData.id, 'CREATE Category returns HTTP 201 with created object');
    if (createData && createData.id) {
      createdCategoryId = createData.id;
    }

    // Verify record in Database
    const dbCreated = await prisma.category.findUnique({ where: { id: createdCategoryId } });
    assert(
      !!dbCreated && dbCreated.name === testCategoryName && dbCreated.slug === testCategorySlug && dbCreated.isFeatured === true,
      'CREATE Category reflects accurately in Database'
    );

    // ----------------------------------------------------
    // Scenario 2: GET Flat Categories Listing
    // ----------------------------------------------------
    clearCategoryCache();
    const getListReqRes = mockReqRes();
    await getCategories(getListReqRes.req, getListReqRes.res);
    const listStatus = getListReqRes.getStatus();
    const listData = getListReqRes.getData();

    assert(
      listStatus === 200 && Array.isArray(listData) && listData.some((c: any) => c.id === createdCategoryId),
      'GET All Categories includes the newly created category'
    );

    // ----------------------------------------------------
    // Scenario 3: GET Category By Slug
    // ----------------------------------------------------
    clearCategoryCache();
    const getBySlugReqRes = mockReqRes({ slug: testCategorySlug });
    await getCategoryBySlug(getBySlugReqRes.req, getBySlugReqRes.res);
    const slugStatus = getBySlugReqRes.getStatus();
    const slugData = getBySlugReqRes.getData();

    assert(
      slugStatus === 200 && slugData && slugData.id === createdCategoryId,
      'GET Category By Slug returns correct category details'
    );

    // ----------------------------------------------------
    // Scenario 4: UPDATE Category (Partial & Full Updates)
    // ----------------------------------------------------
    const updatedName = `${testCategoryName} - Updated`;
    const updatedDescription = 'Updated description via automated test';

    const updateReqRes = mockReqRes({ id: createdCategoryId }, {
      name: updatedName,
      description: updatedDescription,
      isFeatured: false,
      shippingCharge: 200
    });

    await updateCategory(updateReqRes.req, updateReqRes.res);
    const updateStatus = updateReqRes.getStatus();
    const updateData = updateReqRes.getData();

    assert(updateStatus === 200 && updateData && updateData.name === updatedName, 'UPDATE Category returns HTTP 200 with updated fields');

    // Verify in DB that partial update preserved unspecified fields (like slug) and updated requested fields
    const dbUpdated = await prisma.category.findUnique({ where: { id: createdCategoryId } });
    assert(
      !!dbUpdated &&
      dbUpdated.name === updatedName &&
      dbUpdated.description === updatedDescription &&
      dbUpdated.slug === testCategorySlug && // Slug preserved!
      dbUpdated.isFeatured === false && // isFeatured updated!
      Number(dbUpdated.shippingCharge) === 200, // shippingCharge updated!
      'UPDATE Category persists correctly in DB without zeroing unspecified fields'
    );

    // Verify cache invalidation & updated list fetch
    clearCategoryCache();
    const postUpdateListReqRes = mockReqRes();
    await getCategories(postUpdateListReqRes.req, postUpdateListReqRes.res);
    const postUpdateData = postUpdateListReqRes.getData();
    const foundInList = Array.isArray(postUpdateData) ? postUpdateData.find((c: any) => c.id === createdCategoryId) : null;

    assert(
      !!foundInList && foundInList.name === updatedName,
      'API GET All Categories reflects UPDATED Category name after cache purge'
    );

    // ----------------------------------------------------
    // Scenario 5: CREATE Subcategory & Verify Parent Relation
    // ----------------------------------------------------
    const childCategoryName = `Subcat ${Date.now()}`;
    const childCategorySlug = `subcat-slug-${Date.now()}`;
    const createChildReqRes = mockReqRes({}, {
      name: childCategoryName,
      slug: childCategorySlug,
      parentId: createdCategoryId
    });

    await createCategory(createChildReqRes.req, createChildReqRes.res);
    const childData = createChildReqRes.getData();
    assert(createChildReqRes.getStatus() === 201 && childData && childData.parentId === createdCategoryId, 'CREATE Subcategory links parentId properly');

    const childId = childData?.id;

    // Verify Breadcrumbs for Child Category
    clearCategoryCache();
    const breadcrumbReqRes = mockReqRes({ slug: childCategorySlug });
    await getBreadcrumbsBySlug(breadcrumbReqRes.req, breadcrumbReqRes.res);
    const crumbs = breadcrumbReqRes.getData();

    assert(
      breadcrumbReqRes.getStatus() === 200 && Array.isArray(crumbs) && crumbs.length === 2 && crumbs[0].id === createdCategoryId && crumbs[1].id === childId,
      'GET Breadcrumbs by Slug builds hierarchical pathway correctly'
    );

    // Clean up child category
    if (childId) {
      const deleteChildReqRes = mockReqRes({ id: childId });
      await deleteCategory(deleteChildReqRes.req, deleteChildReqRes.res);
    }

    // ----------------------------------------------------
    // Scenario 6: DELETE Category
    // ----------------------------------------------------
    const deleteReqRes = mockReqRes({ id: createdCategoryId });
    await deleteCategory(deleteReqRes.req, deleteReqRes.res);
    const deleteStatus = deleteReqRes.getStatus();

    assert(deleteStatus === 200, 'DELETE Category returns HTTP 200');

    // Verify DB purge
    const dbDeleted = await prisma.category.findUnique({ where: { id: createdCategoryId } });
    assert(!dbDeleted, 'DELETE Category completely purges record from DB');

    // Verify cache purged and no longer appears in GET listing
    clearCategoryCache();
    const postDeleteListReqRes = mockReqRes();
    await getCategories(postDeleteListReqRes.req, postDeleteListReqRes.res);
    const postDeleteList = postDeleteListReqRes.getData();
    const existsPostDelete = Array.isArray(postDeleteList) && postDeleteList.some((c: any) => c.id === createdCategoryId);

    assert(!existsPostDelete, 'GET All Categories no longer includes DELETED Category');

  } catch (err: any) {
    console.error('Unhandled test suite exception:', err);
  } finally {
    console.log(`\n==================================================`);
    console.log(`📊 TEST RESULTS: ${passedCount} / ${totalCount} SCENARIOS PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
    console.log(`==================================================\n`);
    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

runCategoryTestSuite();
