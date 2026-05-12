import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createHierarchyNodeTool } from '../../../tools/hierarchy/createHierarchyNode';
import { deleteHierarchyNodeTool } from '../../../tools/hierarchy/deleteHierarchyNode';
import { updateHierarchyNodeTool } from '../../../tools/hierarchy/updateHierarchyNode';
import { mockCalm } from '../../helpers/mockCalm';

describe('hierarchy CRUD tools', () => {
  describe('calm_hierarchy_create_node', () => {
    test('rejects when title missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createHierarchyNodeTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards payload to calm.hierarchy.create', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'h1', title: 'T' }));
      const result = await createHierarchyNodeTool.handler(
        { calm },
        { title: 'T', parentNodeUuid: 'root', sequence: 2 },
      );
      expect(calls[0]).toMatchObject({
        service: 'hierarchy',
        method: 'create',
        args: [{ title: 'T', parentNodeUuid: 'root', sequence: 2 }],
      });
      expect(result.uuid).toBe('h1');
    });

    test('ODATA_ERROR carries serviceCode', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromOData(400, { code: 'BAD', message: 'no' }),
      );
      await expect(
        createHierarchyNodeTool.handler({ calm }, { title: 'T' }),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD' });
    });
  });

  describe('calm_hierarchy_update_node', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        updateHierarchyNodeTool.handler({ calm }, { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('separates uuid from patch payload', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'h1' }));
      await updateHierarchyNodeTool.handler(
        { calm },
        { uuid: 'h1', title: 'renamed', sequence: 5 },
      );
      expect(calls[0]).toMatchObject({
        service: 'hierarchy',
        method: 'update',
        args: ['h1', { title: 'renamed', sequence: 5 }],
      });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('HierarchyNode', 'h1'),
      );
      await expect(
        updateHierarchyNodeTool.handler({ calm }, { uuid: 'h1', title: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_hierarchy_delete_node', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        deleteHierarchyNodeTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('returns confirmation on success', async () => {
      const { calm, calls } = mockCalm(() => undefined);
      const result = await deleteHierarchyNodeTool.handler(
        { calm },
        { uuid: 'h1' },
      );
      expect(calls[0]).toMatchObject({
        service: 'hierarchy',
        method: 'delete',
        args: ['h1'],
      });
      expect(result).toEqual({ deleted: true, uuid: 'h1' });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('HierarchyNode', 'h1'),
      );
      await expect(
        deleteHierarchyNodeTool.handler({ calm }, { uuid: 'h1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
