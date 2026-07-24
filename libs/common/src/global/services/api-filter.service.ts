import { Model } from 'mongoose';
import * as querystring from 'node:querystring';
import { PaginatedResponse } from '../types/paginated-res.interface';
import { Injectable } from '@nestjs/common';

export class ApiFeatureService<T> {
  public query: any;
  private queryString: any;
  private filterQuery: any;
  private baseFilter: any;
  constructor(
    queryString: any,
    private model: Model<T>,
    baseFilter: any = {},
  ) {
    this.query = this.model.find(baseFilter);
    this.queryString = queryString;
    this.baseFilter = baseFilter;
  }
  filter() {
    const excludeFields = ['limit', 'sort', 'page', 'select'];
    const queryObj = { ...this.queryString };
    excludeFields.forEach((f) => delete queryObj[f]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|eq|ne|in)\b/g,
      (match) => `$${match}`,
    );

    this.filterQuery = {
      ...this.baseFilter,
      ...JSON.parse(queryStr),
    };
    this.query = this.query.find(this.filterQuery);
    return this;
  }
  sort() {
    let sortBy = '-createdAt';
    if (this.queryString.sort) {
      sortBy = this.queryString.sort.split(',').join(' ');
    }
    this.query = this.query.sort(sortBy);
    return this;
  }

  select() {
    if (this.queryString.select) {
      const feilds = this.queryString.select.split(',').join(' ');
      this.query = this.query.select(feilds);
    }
    return this;
  }
  async populate(feild: string) {
    this.query = this.query.populate(feild);
    return this;
  }
  paginate() {
    const page = Number(this.queryString.page) || 1;
    const limit = Math.min(Number(this.queryString.limit) || 5, 100);
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  async execute(): Promise<PaginatedResponse<T>> {
    const currentPage = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 5;
    const totalDocuments = Number(
      await this.model.countDocuments(this.filterQuery),
    );
    const totalPages = Number(Math.ceil(totalDocuments / limit));

    const data = await this.query;
    return {
      results: data.length,
      totalDocuments,
      currentPage,
      totalPages,
      data,
    };
  }
}
